"""
Build Vector Store — Offline script to embed PDF papers into ChromaDB.

Usage: python build_vectorstore.py

This reads all PDFs from data/papers/, splits them into chunks,
embeds them using nomic-embed-text-v1.5, and stores in ChromaDB.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config

from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text


def main():
    print("=" * 60)
    print("BUILD VECTOR STORE — Embedding Papers into ChromaDB")
    print("=" * 60)

    papers_dir = config.PAPERS_DIR
    if not os.path.exists(papers_dir):
        print(f"ERROR: Papers directory not found: {papers_dir}")
        return

    # Find all PDFs
    pdf_files = [f for f in os.listdir(papers_dir) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print(f"ERROR: No PDF files found in {papers_dir}")
        return

    print(f"\nFound {len(pdf_files)} PDF papers:")
    for f in pdf_files:
        print(f"  - {f}")

    # Extract text from all PDFs
    print("\n[1/3] Extracting text from PDFs...")
    documents = []
    for pdf_file in pdf_files:
        pdf_path = os.path.join(papers_dir, pdf_file)
        try:
            text = extract_text_from_pdf(pdf_path)
            if text.strip():
                documents.append({
                    'text': text,
                    'source': pdf_file,
                })
                print(f"  ✓ {pdf_file} ({len(text)} chars)")
            else:
                print(f"  ✗ {pdf_file} (no text extracted)")
        except Exception as e:
            print(f"  ✗ {pdf_file} (error: {e})")

    if not documents:
        print("ERROR: No text extracted from any PDF.")
        return

    # Split into chunks
    print(f"\n[2/3] Splitting into chunks (800 chars, 100 overlap)...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    all_chunks = []
    all_metadatas = []
    all_ids = []

    for doc in documents:
        chunks = splitter.split_text(doc['text'])
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                'source': doc['source'],
                'chunk_index': i,
            })
            all_ids.append(f"{doc['source']}_{i}")

    print(f"  Total chunks: {len(all_chunks)}")

    # Create ChromaDB collection with sentence-transformers embedding
    print(f"\n[3/3] Embedding and storing in ChromaDB...")
    print(f"  Persist directory: {config.CHROMA_PERSIST_DIR}")
    print(f"  Loading embedding model (all-MiniLM-L6-v2 via sentence-transformers)...")

    from sentence_transformers import SentenceTransformer

    embed_model = SentenceTransformer('all-MiniLM-L6-v2')
    print(f"  Model loaded.")

    # Remove existing DB if present
    if os.path.exists(config.CHROMA_PERSIST_DIR):
        import shutil
        shutil.rmtree(config.CHROMA_PERSIST_DIR)
        print("  (Removed existing vector store)")

    client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)

    collection = client.create_collection(
        name="churn_papers",
        metadata={"description": "Customer churn research papers", "hnsw:space": "cosine"}
    )

    # Embed and add in batches
    batch_size = 64
    for i in range(0, len(all_chunks), batch_size):
        batch_end = min(i + batch_size, len(all_chunks))
        batch_texts = all_chunks[i:batch_end]

        # Generate embeddings with sentence-transformers
        embeddings = embed_model.encode(batch_texts, show_progress_bar=False).tolist()

        collection.add(
            documents=batch_texts,
            embeddings=embeddings,
            metadatas=all_metadatas[i:batch_end],
            ids=all_ids[i:batch_end],
        )
        print(f"  Added batch {i//batch_size + 1} ({batch_end}/{len(all_chunks)} chunks)")

    print(f"\n✅ Vector store built successfully!")
    print(f"   Collection: churn_papers")
    print(f"   Total chunks: {collection.count()}")
    print(f"   Location: {config.CHROMA_PERSIST_DIR}")


if __name__ == '__main__':
    main()
