"""
RAG Engine — ChromaDB vector store retrieval.
Loads pre-built vector store and searches for relevant paper chunks.
Uses sentence-transformers for query embedding.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import config

_collection = None
_client = None
_embed_model = None
_reranker = None


def init_rag():
    """Initialize ChromaDB client and load collection."""
    global _collection, _client, _embed_model, _reranker

    if not os.path.exists(config.CHROMA_PERSIST_DIR):
        print("[RAG] Vector store not found. Run build_vectorstore.py first.")
        return False

    try:
        import chromadb
        _client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        _collection = _client.get_collection("churn_papers")
        count = _collection.count()

        # Load embedding model for queries (config = single source of truth)
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer(config.EMBEDDING_MODEL)

        print(f"[RAG] Loaded vector store: {count} chunks")

        # Load cross-encoder reranker (optional — graceful degradation).
        if getattr(config, 'RERANK_ENABLED', False):
            try:
                from sentence_transformers import CrossEncoder
                _reranker = CrossEncoder(config.RERANK_MODEL)
                print(f"[RAG] Reranker loaded: {config.RERANK_MODEL}")
            except Exception as e:
                _reranker = None
                print(f"[RAG WARNING] Reranker failed to load (using bi-encoder only): {e}")

        return True
    except Exception as e:
        print(f"[RAG WARNING] Failed to load vector store: {e}")
        return False


def search_papers(query: str, k: int = 4) -> list:
    """
    Search vector store for relevant paper chunks (retrieve-then-rerank).

    Stage 1 (retrieve): bi-encoder fetches up to RERANK_CANDIDATE_K candidates.
    Stage 2 (rerank): cross-encoder scores each (query, chunk) pair and keeps
    the top-k. If the reranker is unavailable, falls back to the bi-encoder
    order. Returns list of dicts with 'content', 'source' (and 'rerank_score'
    when reranking was applied).
    """
    if _collection is None or _embed_model is None:
        return []

    try:
        # Retrieve more candidates than needed when reranking is active.
        candidate_k = k
        if _reranker is not None:
            candidate_k = max(k, getattr(config, 'RERANK_CANDIDATE_K', 20))

        # Embed query with same model used during indexing
        query_embedding = _embed_model.encode([query]).tolist()

        results = _collection.query(
            query_embeddings=query_embedding,
            n_results=candidate_k
        )

        chunks = []
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                chunks.append({
                    'content': doc,
                    'source': metadata.get('source', 'Unknown'),
                })

        if not chunks:
            return []

        # Stage 2: rerank with cross-encoder when available.
        if _reranker is not None and len(chunks) > 0:
            try:
                pairs = [(query, c['content']) for c in chunks]
                scores = _reranker.predict(pairs)
                for c, s in zip(chunks, scores):
                    c['rerank_score'] = float(s)
                chunks.sort(key=lambda c: c['rerank_score'], reverse=True)
            except Exception as e:
                print(f"[RAG] Rerank error (falling back to bi-encoder order): {e}")

        return chunks[:k]
    except Exception as e:
        print(f"[RAG] Search error: {e}")
        return []


def is_available() -> bool:
    """Check if RAG engine is ready."""
    return _collection is not None and _embed_model is not None


def get_embed_model():
    """Return the loaded multilingual embedding model (shared with the
    semantic cache in Phase 7). May be None if RAG failed to initialize."""
    return _embed_model
