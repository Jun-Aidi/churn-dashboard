# Churn Dashboard

Dashboard prediksi customer churn dengan chatbot AI (RAG + LLM).

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Python Flask |
| Database | MySQL + ChromaDB (vector store) |
| ML Model | Random Forest (scikit-learn) |
| Chatbot | DeepSeek LLM + RAG (9 paper akademik) |
| Embedding | all-MiniLM-L6-v2 (sentence-transformers) |

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

### 3. Konfigurasi Environment

```bash
# Copy .env.example menjadi .env
copy .env.example .env

# Edit .env — isi minimal:
#   MYSQL_PASSWORD (password MySQL kamu)
#   DEEPSEEK_API_KEY (API key dari Tencent TokenHub atau provider lain)
```

### 4. Setup MySQL

Pastikan MySQL sudah running. Database akan otomatis dibuat saat pertama kali server dijalankan, termasuk seed data dari `data/merged_dataset.csv`.

Jika ingin membuat database manual:
```sql
CREATE DATABASE IF NOT EXISTS churn_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Build Vector Store (sekali saja)

```bash
# Masih di folder backend dengan venv aktif
python build_vectorstore.py
```

Proses ini membaca 9 PDF paper dari `data/papers/`, memecah menjadi chunks, embed dengan sentence-transformers, dan menyimpan ke ChromaDB. Hanya perlu dijalankan sekali (atau jika paper ditambah/diubah).

### 6. Jalankan Backend

```bash
python run.py
```

Output yang diharapkan:
```
[DB] Database 'churn_dashboard' ensured.
[DB] Connected to MySQL: churn_dashboard@localhost
[DB] Customers table already has 2955 rows. Skipping seed.
[RAG] Loaded vector store: 1123 chunks
[LLM] DeepSeek client initialized (model: deepseek-v4-flash)
 * Running on http://127.0.0.1:5000
```

### 7. Setup & Jalankan Frontend

```bash
# Buka terminal baru
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173` dan terhubung ke backend di `http://localhost:5000`.

## Struktur Project

```
churn-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── database.py          # MySQL models + auto-create DB
│   │   ├── routes.py            # API endpoints
│   │   ├── nlp/
│   │   │   ├── chat_engine.py   # Chatbot pipeline + guardrails
│   │   │   ├── llm_client.py    # DeepSeek LLM + function calling
│   │   │   └── rag_engine.py    # ChromaDB retrieval
│   │   └── services/
│   │       ├── customer_service.py  # Data access (MySQL/CSV)
│   │       └── predict_service.py   # ML prediction
│   ├── data/
│   │   ├── merged_dataset.csv   # Dataset utama (2955 customers)
│   │   ├── papers/              # 9 PDF paper churn (untuk RAG)
│   │   └── raw/                 # Dataset mentah (belum merge)
│   ├── models/
│   │   └── churn_model_bundle.pkl  # Model Random Forest
│   ├── chroma_db/               # Vector store (git-ignored)
│   ├── build_vectorstore.py     # Script offline: embed papers
│   ├── config.py                # Konfigurasi
│   ├── run.py                   # Entry point server
│   ├── .env                     # Environment variables (git-ignored)
│   └── .env.example             # Template environment
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/               # Dashboard, Customers, Predict, Upload
│   │   ├── components/
│   │   │   └── copilot/         # Chatbot widget (Ghosting)
│   │   └── api/                 # API client
│   └── package.json
└── PLANNING.md                  # Dokumentasi arsitektur
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/customers` | Semua pelanggan + risk score |
| GET | `/api/customers/:id` | Detail satu pelanggan |
| GET | `/api/customers/stats` | Statistik ringkasan |
| GET | `/api/trend` | Data tren churn bulanan |
| POST | `/api/predict` | Prediksi churn (input manual) |
| POST | `/api/chat` | Chatbot AI (LLM + RAG) |
| POST | `/api/upload` | Upload CSV pelanggan |

## Chatbot (Ghosting)

Chatbot menggunakan arsitektur **RAG + LLM**:
- **LLM**: DeepSeek v4 Flash (via Tencent TokenHub, OpenAI-compatible)
- **RAG**: 9 paper akademik tentang customer churn
- **Function Calling**: LLM otomatis query database untuk data real-time
- **Guardrails**: 3 layer (regex filter, system prompt, output validation)

Ganti provider LLM dengan mengubah `DEEPSEEK_BASE_URL` dan `DEEPSEEK_MODEL` di `.env`.

## Catatan

- Python **harus versi 3.10** — versi lebih baru (3.11+) mungkin tidak kompatibel dengan beberapa library (torch, chromadb, onnxruntime)
- MySQL harus sudah running sebelum start backend
- Jika MySQL tidak tersedia, backend otomatis fallback ke mode CSV (tanpa persistensi)
- Vector store (`chroma_db/`) di-gitignore — perlu build ulang setelah clone
