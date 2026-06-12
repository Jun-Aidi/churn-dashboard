"""
Semantic Cache Engine — caches LLM answers for semantically similar,
conceptual questions to save tokens and latency.

Safety rules (see master_planning.md Fase 7, B.2):
  - Scoped per user_id — a user never sees another user's cached answer.
  - Only conceptual/theoretical questions are cached (RAG/paper-based answers
    that are stable). Questions tied to live data or specific entities
    (e.g. C-0001, "berapa total high-risk") are NEVER cached.
  - TTL acts as an extra safety layer.
  - Cache is invalidated for a user when they upload a new dataset.

Storage: a second ChromaDB collection ("chat_cache") reusing the same
multilingual embedding model as the RAG engine.
"""

import os
import re
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import config

_cache_collection = None

# Patterns that mark a question as NON-cacheable (live-data / entity-specific).
_ENTITY_PATTERNS = [
    r'c-?\d+',                       # customer id e.g. C-0001 / c0001
    r'\bberapa\b',                   # "berapa ..." aggregate over live data
    r'\bjumlah\b',
    r'\btotal\b',
    r'\bhigh[- ]?risk\b',
    r'\brisiko tinggi\b',
    r'\bpelanggan saya\b',
    r'\bdata saya\b',
    r'\bsiapa\b',                    # "siapa pelanggan ..."
]


def init_cache():
    """Initialize the chat_cache ChromaDB collection (reuses RAG client)."""
    global _cache_collection

    if not getattr(config, 'SEMANTIC_CACHE_ENABLED', False):
        print("[CACHE] Semantic cache disabled.")
        return False

    try:
        import chromadb
        client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        _cache_collection = client.get_or_create_collection(
            name="chat_cache",
            metadata={"description": "Semantic cache for conceptual chat answers",
                      "hnsw:space": "cosine"}
        )
        print(f"[CACHE] Semantic cache ready: {_cache_collection.count()} entries")
        return True
    except Exception as e:
        _cache_collection = None
        print(f"[CACHE WARNING] Failed to init semantic cache: {e}")
        return False


def is_cacheable(text: str) -> bool:
    """Heuristic: only cache conceptual questions (no live-data/entity refs)."""
    t = (text or "").lower()
    for pat in _ENTITY_PATTERNS:
        if re.search(pat, t):
            return False
    return True


def _embed(query: str):
    """Embed a query using the shared RAG embedding model."""
    from app.nlp.rag_engine import get_embed_model
    model = get_embed_model()
    if model is None:
        return None
    return model.encode([query]).tolist()


def cache_lookup(query: str, user_id):
    """Return a cached answer dict for a semantically similar question owned by
    user_id, or None on miss/disabled/non-cacheable."""
    if _cache_collection is None or user_id is None:
        return None
    if not is_cacheable(query):
        return None

    try:
        embedding = _embed(query)
        if embedding is None:
            return None

        results = _cache_collection.query(
            query_embeddings=embedding,
            n_results=1,
            where={"user_id": int(user_id)},
        )

        docs = results.get('documents') or []
        if not docs or not docs[0]:
            return None

        distance = results['distances'][0][0]
        metadata = results['metadatas'][0][0] if results.get('metadatas') else {}
        # cosine distance -> similarity
        similarity = 1.0 - float(distance)

        # TTL guard
        created_at = float(metadata.get('created_at', 0))
        ttl = getattr(config, 'CACHE_TTL_SECONDS', 3600)
        if ttl and (time.time() - created_at) > ttl:
            return None

        if similarity >= getattr(config, 'CACHE_THRESHOLD', 0.92):
            return {
                'response': docs[0][0],
                'source': 'cache',
                'tokens_used': 0,
                'similarity': similarity,
            }
        return None
    except Exception as e:
        print(f"[CACHE] Lookup error: {e}")
        return None


def cache_store(query: str, answer: str, user_id):
    """Store an answer for a conceptual question, scoped to user_id."""
    if _cache_collection is None or user_id is None:
        return
    if not is_cacheable(query) or not answer:
        return

    try:
        embedding = _embed(query)
        if embedding is None:
            return

        entry_id = f"{user_id}_{uuid.uuid4().hex}"
        _cache_collection.add(
            ids=[entry_id],
            embeddings=embedding,
            documents=[answer],
            metadatas=[{
                'user_id': int(user_id),
                'question': query,
                'created_at': time.time(),
            }],
        )
    except Exception as e:
        print(f"[CACHE] Store error: {e}")


def cache_invalidate(user_id=None):
    """Invalidate cached answers for a user (or all users if user_id is None)."""
    if _cache_collection is None:
        return
    try:
        if user_id is None:
            # Delete everything by recreating is overkill; delete with empty where
            # is unsupported, so fetch all ids.
            all_items = _cache_collection.get()
            ids = all_items.get('ids') or []
            if ids:
                _cache_collection.delete(ids=ids)
        else:
            _cache_collection.delete(where={"user_id": int(user_id)})
    except Exception as e:
        print(f"[CACHE] Invalidate error: {e}")


def is_available() -> bool:
    return _cache_collection is not None
