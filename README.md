# Churn Dashboard

Dashboard prediksi customer churn dengan chatbot AI (RAG + LLM), autentikasi JWT, dan panel admin.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + TanStack React Query |
| Backend | Python Flask (+ gzip via flask-compress) |
| Auth | JWT (login, role admin/user, rate limiting) |
| Database | MySQL + ChromaDB (vector store) |
| ML Model | Random Forest (scikit-learn) |
| Chatbot | DeepSeek LLM + RAG (paper akademik) |
| Embedding | paraphrase-multilingual-MiniLM-L12-v2 (cross-lingual ID→EN) |
| Reranking | cross-encoder/mmarco-mMiniLMv2-L12-H384-v1 (multilingual) |
| Semantic Cache | ChromaDB (cache jawaban konseptual per-user) |

## Prerequisites

- **Python 3.10** (wajib versi 3.10 untuk kompatibilitas library seperti torch, chromadb, sentence-transformers)
- **Node.js** >= 18
- **MySQL** >= 8.0 (harus sudah running)
- **Git**

## Setup & Menjalankan

### 1. Clone Repository

```bash
git clone <repo-url>
cd churn-dashboard
```

### 2. Setup Backend

```bash
cd backend

# Buat virtual environment dengan Python 3.10
py -3.10 -m venv venv

# Aktivasi venv
# Windows CMD:
venv\Scripts\activate.bat
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

> Semua perintah backend (build vector store, run server, test) dijalankan dengan **venv aktif**.

### 3. Konfigurasi Environment

```bash
# Copy .env.example menjadi .env
copy .env.example .env
```

Edit `.env` — isi minimal:

| Variabel | Keterangan |
|----------|------------|
| `MYSQL_PASSWORD` | Password MySQL kamu |
| `DEEPSEEK_API_KEY` | API key dari provider OpenAI-compatible |
| `JWT_SECRET` | Secret untuk menandatangani token (ganti di produksi) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Kredensial admin default (dibuat otomatis saat tabel users kosong) |

Opsional: `RERANK_ENABLED`, `RERANK_MODEL`, `SEMANTIC_CACHE_ENABLED`, `CACHE_THRESHOLD`, `CACHE_TTL_SECONDS` (punya default yang aman, lihat `config.py`).

### 4. Setup MySQL

Pastikan MySQL sudah running. Database dan tabel dibuat otomatis saat server pertama kali dijalankan. **Tidak ada seeding data pelanggan otomatis** — data pelanggan diisi lewat endpoint `/api/upload`. Yang otomatis dibuat hanya:
- Skema tabel (`customers`, `chat_history`, `users`)
- User admin default (dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` di `.env`)

Jika ingin membuat database manual:
```sql
CREATE DATABASE IF NOT EXISTS churn_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Build Vector Store (sekali saja)

```bash
# Masih di folder backend dengan venv aktif
python build_vectorstore.py
```

Proses ini membaca semua PDF paper dari `data/papers/`, memecahnya menjadi chunks (~450 karakter), meng-embed dengan model multilingual, dan menyimpannya ke ChromaDB (~2.000 chunk). Cukup dijalankan sekali, atau ulangi jika paper ditambah/diubah lalu restart backend.

> **Catatan unduhan model:** saat pertama kali jalan, model embedding (~470 MB) dan reranker (~470 MB) akan diunduh otomatis dan di-cache. Butuh koneksi internet di run pertama saja.

### 6. Jalankan Backend

```bash
python run.py
```

Output yang diharapkan:
```
[DB] Database 'churn_dashboard' ensured.
[DB] Connected to MySQL: churn_dashboard@localhost
[DB] Database initialized. Data will be populated via CSV uploads.
[RAG] Loaded vector store: 2091 chunks
[RAG] Reranker loaded: cross-encoder/mmarco-mMiniLMv2-L12-H384-v1
[CACHE] Semantic cache ready: 0 entries
[LLM] DeepSeek client initialized (model: deepseek-v4-flash)
 * Running on http://127.0.0.1:5000
```

### 7. Setup & Jalankan Frontend

```bash
# Buka terminal baru
cd frontend

# Install dependencies (termasuk @tanstack/react-query)
npm install

# Jalankan development server
npm run dev
```

Frontend berjalan di `http://localhost:5173` dan terhubung ke backend di `http://localhost:5000`. Login memakai kredensial admin dari `.env`.

## Struktur Project

```
churn-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py              # Flask app factory (gzip, init DB/RAG/cache/LLM)
│   │   ├── database.py              # MySQL models + auto-create DB & tabel
│   │   ├── middleware/
│   │   │   └── auth.py              # Decorator auth_required / admin_required
│   │   ├── models/
│   │   │   └── user.py              # Model User
│   │   ├── routes/
│   │   │   ├── main_routes.py       # API: customers, predict, trend, chat, upload
│   │   │   └── auth_routes.py       # API: login, user management, stats
│   │   ├── nlp/
│   │   │   ├── chat_engine.py       # Pipeline chatbot + guardrails + cache hook
│   │   │   ├── llm_client.py        # DeepSeek LLM + function calling
│   │   │   ├── rag_engine.py        # Retrieval ChromaDB + reranking
│   │   │   └── cache_engine.py      # Semantic cache (per-user)
│   │   ├── services/
│   │   │   ├── customer_service.py  # Data access (MySQL) + prediksi
│   │   │   ├── customer_cache.py    # Cache DataFrame per-user (TTL pendek)
│   │   │   └── predict_service.py   # Prediksi ML (input manual + feature importance)
│   │   ├── utils/
│   │   │   ├── jwt_utils.py         # Buat/verifikasi token
│   │   │   └── rate_limiter.py      # Rate limit login
│   │   └── nlp_raw_model/           # Notebook riset (eksperimen, bukan runtime)
│   ├── data/
│   │   ├── merged_dataset.csv       # Dataset contoh untuk di-upload
│   │   ├── papers/                  # PDF paper churn (untuk RAG)
│   │   └── raw/                     # Dataset mentah (belum merge)
│   ├── models/
│   │   └── churn_model_bundle.pkl   # Model Random Forest
│   ├── chroma_db/                   # Vector store + cache (git-ignored)
│   ├── build_vectorstore.py         # Script offline: embed papers
│   ├── config.py                    # Konfigurasi (env, model, RAG, cache)
│   ├── run.py                       # Entry point server
│   ├── .env                         # Environment variables (git-ignored)
│   └── .env.example                 # Template environment
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx                 # Provider React Query + Theme
│   │   ├── pages/                   # Dashboard, Customers, Predict, Upload, Admin, Login
│   │   ├── hooks/                   # useCustomers / useTrend (React Query)
│   │   ├── components/
│   │   │   └── copilot/             # Chatbot widget (Ghosting)
│   │   └── api/                     # API client
│   └── package.json
└── todo.md                          # Dokumentasi rencana & arsitektur
```

## API Endpoints

Semua endpoint data & chat memerlukan header `Authorization: Bearer <token>`.

### Data & Chatbot

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/customers` | Semua pelanggan + risk score (mendukung `?page=&per_page=&risk=`) |
| GET | `/api/customers/:id` | Detail satu pelanggan |
| GET | `/api/customers/stats` | Statistik ringkasan |
| POST | `/api/customers` | Tambah satu pelanggan (input manual) |
| GET | `/api/trend` | Data tren churn bulanan |
| GET | `/api/feature-importance` | Feature importance global model |
| POST | `/api/predict` | Prediksi churn (input manual) |
| POST | `/api/chat` | Chatbot AI (LLM + RAG + cache) |
| POST | `/api/upload` | Upload CSV pelanggan (mengganti data milik user) |

### Auth & Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login, kembalikan JWT |
| POST | `/api/auth/logout` | Logout (invalidasi sisi klien) |
| GET | `/api/auth/me` | Profil user yang login |
| GET | `/api/auth/users` | Daftar user (admin) |
| POST | `/api/auth/users` | Buat user (admin) |
| PUT | `/api/auth/users/:id` | Update user (admin) |
| POST | `/api/auth/users/:id/activate` · `/deactivate` | Aktif/nonaktif user (admin) |
| GET | `/api/auth/stats` | Statistik sistem (admin) |

## Chatbot (Ghosting)

Chatbot memakai arsitektur **RAG + LLM** dengan retrieve-then-rerank:
- **LLM**: DeepSeek v4 Flash (via OpenAI-compatible)
- **RAG**: paper akademik tentang customer churn, di-embed dengan model **multilingual** (query Bahasa Indonesia bisa menemukan paper berbahasa Inggris)
- **Reranking**: cross-encoder multilingual menyaring kandidat retrieval agar konteks yang dikirim ke LLM lebih presisi (otomatis fallback ke bi-encoder bila reranker gagal dimuat)
- **Semantic Caching**: jawaban untuk pertanyaan konseptual yang maknanya mirip dilayani dari cache (per-user, dengan TTL) untuk hemat token & latensi; pertanyaan yang menyebut data live/entitas spesifik (mis. `C-0001`) tidak di-cache
- **Function Calling**: LLM otomatis query database untuk data real-time (scoped ke data milik user yang login)
- **Guardrails**: 3 layer (regex filter input, system prompt, validasi output)

Ganti provider LLM dengan mengubah `DEEPSEEK_BASE_URL` dan `DEEPSEEK_MODEL` di `.env`.

## Menjalankan Test (Backend)

```bash
# Folder backend dengan venv aktif
python -m pytest tests/ -q
```

## Catatan

- Python **harus versi 3.10** — versi lebih baru (3.11+) mungkin tidak kompatibel dengan beberapa library (torch, chromadb, onnxruntime)
- MySQL harus sudah running sebelum start backend
- Jika MySQL tidak tersedia, backend tetap jalan namun tanpa persistensi data
- Data pelanggan **tidak di-seed otomatis** — isi lewat halaman Upload / endpoint `/api/upload`
- Vector store (`chroma_db/`) di-gitignore — perlu build ulang (`python build_vectorstore.py`) setelah clone
- Setelah menambah/mengubah paper atau rebuild vector store, **restart backend** agar koleksi baru dimuat
```
