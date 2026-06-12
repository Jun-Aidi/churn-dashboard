"""
Configuration — Environment variables & paths.
"""

import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── MySQL ──
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'churn_dashboard')
SQLALCHEMY_DATABASE_URI = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
)

# ── DeepSeek LLM (via Tencent TokenHub) ──
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://tokenhub-intl.tencentcloudmaas.com/v1')
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-v4-flash')

# ── ChromaDB ──
CHROMA_PERSIST_DIR = os.path.join(BASE_DIR, 'chroma_db')

# ── Embedding Model ──
# Multilingual bi-encoder: query chatbot berbahasa Indonesia, korpus paper
# berbahasa Inggris (cross-lingual retrieval). 384-dim, max 128 token.
# Satu sumber kebenaran — build_vectorstore.py & rag_engine.py membaca dari sini.
EMBEDDING_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'

# ── RAG Reranking (Fase 6) ──
# Cross-encoder multilingual untuk retrieve-then-rerank. Harus multilingual
# agar gain cross-lingual (query ID -> dokumen EN) tidak hilang di tahap rerank.
RERANK_ENABLED = os.getenv('RERANK_ENABLED', 'true').lower() == 'true'
RERANK_MODEL = os.getenv('RERANK_MODEL', 'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1')
RERANK_CANDIDATE_K = int(os.getenv('RERANK_CANDIDATE_K', 20))

# ── Semantic Caching (Fase 7) ──
# Cache jawaban LLM untuk pertanyaan konseptual yang maknanya mirip.
# Scoped per user_id, hanya pertanyaan cacheable, dengan TTL pengaman.
SEMANTIC_CACHE_ENABLED = os.getenv('SEMANTIC_CACHE_ENABLED', 'true').lower() == 'true'
CACHE_THRESHOLD = float(os.getenv('CACHE_THRESHOLD', 0.92))
CACHE_TTL_SECONDS = int(os.getenv('CACHE_TTL_SECONDS', 3600))

# ── Paths ──
DATA_PATH = os.path.join(BASE_DIR, 'data', 'merged_dataset.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'churn_model_bundle.pkl')
PAPERS_DIR = os.path.join(BASE_DIR, 'data', 'papers')
RAW_DATA_DIR = os.path.join(BASE_DIR, 'data', 'raw')

# ── JWT ──
JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')

# ── Flask ──
DEBUG = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
HOST = '0.0.0.0'
PORT = 5000

# ── CORS ──
# Hanya dipakai saat DEBUG=true (development). Di produksi Pola B (reverse proxy
# same-origin), CORS tidak diperlukan. Pisahkan beberapa origin dengan koma.
# Contoh: CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ORIGINS = [
    o.strip() for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    if o.strip()
]

# ── Batas Ukuran Request ──
# Membatasi ukuran body (mis. upload CSV) untuk mencegah pemakaian memori berlebih.
# Default 16 MB. Atur lewat MAX_CONTENT_LENGTH_MB di .env.
MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH_MB', 16)) * 1024 * 1024
