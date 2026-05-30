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


def init_rag():
    """Initialize ChromaDB client and load collection."""
    global _collection, _client, _embed_model

    if not os.path.exists(config.CHROMA_PERSIST_DIR):
        print("[RAG] Vector store not found. Run build_vectorstore.py first.")
        return False

    try:
        import chromadb
        _client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        _collection = _client.get_collection("churn_papers")
        count = _collection.count()

        # Load embedding model for queries
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer('all-MiniLM-L6-v2')

        print(f"[RAG] Loaded vector store: {count} chunks")
        return True
    except Exception as e:
        print(f"[RAG WARNING] Failed to load vector store: {e}")
        return False


def search_papers(query: str, k: int = 4) -> list:
    """
    Search vector store for relevant paper chunks.
    Returns list of dicts with 'content' and 'source'.
    """
    if _collection is None or _embed_model is None:
        return []

    try:
        # Embed query with same model used during indexing
        query_embedding = _embed_model.encode([query]).tolist()

        results = _collection.query(
            query_embeddings=query_embedding,
            n_results=k
        )

        chunks = []
        if results and results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                chunks.append({
                    'content': doc,
                    'source': metadata.get('source', 'Unknown'),
                })
        return chunks
    except Exception as e:
        print(f"[RAG] Search error: {e}")
        return []


def is_available() -> bool:
    """Check if RAG engine is ready."""
    return _collection is not None and _embed_model is not None
