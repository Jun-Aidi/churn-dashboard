# Planning: Upgrade Chatbot ke RAG + LLM & Integrasi Database

## Konteks Project

Project ini adalah **Churn Dashboard** dengan:
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Python Flask
- **ML Model**: Random Forest (.pkl) untuk prediksi churn
- **Chatbot**: BiLSTM intent classifier + hardcoded template response
- **Data**: CSV-based (belum ada database)

## Masalah yang Diidentifikasi

1. **NLP belum deep learning sesungguhnya** — chatbot hanya intent classification + template response, tidak bisa memahami pertanyaan di luar 11 intent yang sudah ditentukan
2. **Tidak ada database** — data dibaca dari CSV setiap request, tidak ada persistensi
3. **Rekomendasi di dashboard hardcoded** — tidak berbasis data real atau riset ilmiah
4. **Tidak ada history** — prediksi hilang setiap restart

---

## Keputusan Arsitektur

| Keputusan | Hasil |
|-----------|-------|
| Rekomendasi di dashboard | **Dihapus** — sepenuhnya dipindah ke chatbot |
| Chatbot approach | **RAG + LLM** — LLM memahami input DAN menjawab |
| Database | **MySQL** untuk data operasional + **ChromaDB** untuk vector store |
| BiLSTM yang sudah ada | **Opsional fast-path** — untuk intent sederhana yang tidak perlu LLM |
| Paper untuk knowledge base | **5-10 paper** tentang customer churn |
| Embedding model | **nomic-ai/nomic-embed-text-v1.5** (~140MB, lebih akurat dari bge-small) |
| LLM provider | **DeepSeek Flash** via API (OpenAI-compatible, ~$0.14/1M tokens) |

---

## Kenapa Arsitektur Ini Memenuhi Kriteria Deep Learning NLP

Kritik dosen: "Belum deep learning, masih query, tidak bisa memahami pertanyaan di luar list."

**Solusi: LLM (DeepSeek) sebagai otak utama chatbot — memahami DAN menjawab.**

| Kriteria Dosen | Bagaimana Dipenuhi |
|----------------|-------------------|
| Harus bisa memahami di luar query list | LLM memahami bahasa natural apapun — tidak terbatas intent |
| Harus deep learning | LLM = transformer-based deep learning (miliaran parameter) |
| Bukan sekadar keyword matching | LLM memahami semantik, konteks, dan nuansa bahasa |
| Bisa reasoning | LLM menggabungkan data + paper untuk menghasilkan insight baru |

**Perbedaan fundamental:**
- **Sebelum**: User bertanya → BiLSTM klasifikasi intent → return template (tidak paham bahasa)
- **Sesudah**: User bertanya → LLM memahami pertanyaan → ambil data relevan → generate jawaban natural

---

## Arsitektur Baru

```
┌─────────────────────────────────────────────────────────┐
│  OFFLINE (Dijalankan sebelum dashboard)                  │
├─────────────────────────────────────────────────────────┤
│  1. python train_model.py                                │
│     → Input: customers.csv                               │
│     → Output: churn_model.pkl, encoders.pkl              │
│                                                          │
│  2. python build_vectorstore.py                          │
│     → Input: data/papers/*.pdf (5-10 paper churn)        │
│     → Proses: PDF → chunks → embed (nomic-embed) → store│
│     → Output: chroma_db/ (vector index)                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ONLINE (Saat dashboard berjalan)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐     ┌──────────────────────────────┐   │
│  │  Frontend    │────▶│  Flask API                    │   │
│  │  (React)     │     │                              │   │
│  └─────────────┘     │  /api/customers  → DB query   │   │
│                       │  /api/predict    → ML model   │   │
│                       │  /api/upload     → CSV → DB   │   │
│                       │  /api/chat       → LLM + RAG  │   │
│                       └──────────────────────────────┘   │
│                                    │                      │
│                       ┌────────────┼────────────┐        │
│                       ▼            ▼            ▼        │
│                 ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│                 │  MySQL   │ │ ChromaDB │ │ DeepSeek │  │
│                 │  - cust  │ │ - papers │ │  Flash   │  │
│                 │  - preds │ │ - chunks │ │  (LLM)   │  │
│                 │  - chat  │ │          │ │          │  │
│                 └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Alur Chatbot Baru (LLM sebagai Otak Utama)

```
User Message (pertanyaan apapun, tidak terbatas)
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  OPTIONAL: BiLSTM Fast-Path Check                        │
│  - Jika intent sangat jelas + confidence > 90%           │
│    DAN hanya butuh data (misal "cek profil C-0001")      │
│    → Query DB langsung, skip LLM (hemat token)           │
│  - Jika tidak → lanjut ke LLM pipeline                   │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  1. LLM MEMAHAMI PERTANYAAN (DeepSeek Flash)             │
│     - LLM menerima user message                          │
│     - LLM memahami maksud, konteks, nuansa               │
│     - LLM tentukan tools apa yang perlu dipanggil        │
│       via Function Calling:                              │
│       • get_customer_profile(id)                         │
│       • get_risk_statistics()                            │
│       • get_high_risk_customers()                        │
│       • search_papers(query) → ChromaDB retrieval        │
│       • get_segment_analysis()                           │
│       • get_prediction_history(customer_id)              │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  2. EXECUTE TOOLS                                        │
│     - Query MySQL → data pelanggan, statistik, history   │
│     - Query ChromaDB → paper chunks yang relevan         │
│     - Return hasil ke LLM                                │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  3. LLM GENERATE RESPONSE                                │
│     - Gabungkan: data dashboard + paper knowledge        │
│     - Hasilkan jawaban natural, kontekstual              │
│     - Bisa menjawab pertanyaan yang BELUM PERNAH         │
│       dilatih sebelumnya                                 │
└─────────────────────────────────────────────────────────┘
     │
     ▼
  Response → Simpan ke chat_history (MySQL)
```

**Contoh pertanyaan yang sekarang BISA dijawab (sebelumnya tidak bisa):**
- "Kenapa pelanggan enterprise lebih loyal dibanding starter?"
- "Apa hubungan antara NPS rendah dan churn di segmen monthly?"
- "Berdasarkan riset, strategi apa yang paling efektif untuk pelanggan yang sudah 30 hari tidak login?"
- "Bandingkan kondisi C-0001 dengan C-0005, mana yang lebih urgent?"
- "Jelaskan secara detail kenapa payment delay berpengaruh ke churn"

---

## Database Schema (MySQL)

```sql
-- Tabel pelanggan (dari CSV upload)
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(20) UNIQUE NOT NULL,
    plan_type VARCHAR(50),
    contract_type VARCHAR(50),
    tenure_days INT,
    monthly_usage_hrs DECIMAL(10,2),
    feature_adoption_pct DECIMAL(5,2),
    days_since_login INT,
    total_users INT,
    nps_latest DECIMAL(3,1),
    ticket_count INT,
    critical_tickets INT,
    open_tickets INT,
    total_billed DECIMAL(12,2),
    avg_payment_value DECIMAL(10,2),
    late_payment_count INT,
    dunning_count INT,
    avg_days_late DECIMAL(5,1),
    payment_count INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_id (customer_id),
    INDEX idx_risk_class (risk_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel hasil prediksi (history)
CREATE TABLE predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    risk_score DECIMAL(5,1) NOT NULL,
    risk_class ENUM('high', 'med', 'low') NOT NULL,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    INDEX idx_customer_predicted (customer_id, predicted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel chat history
CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    intent_detected VARCHAR(50),
    confidence DECIMAL(4,3),
    source ENUM('llm_rag', 'llm_direct', 'fast_path', 'fallback') NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Handling CSV Upload Duplikat

- Jika `customer_id` sudah ada di DB → **UPDATE** data fitur-nya (ON DUPLICATE KEY UPDATE)
- Jika belum ada → **INSERT** baru
- Setelah upload, jalankan prediksi untuk semua customer → simpan ke `predictions`
- Prediksi baru ditambahkan sebagai row baru (history), bukan overwrite
- Chatbot otomatis menggunakan data terbaru dari DB

---

## Struktur Folder Baru

```
backend/
├── train_model.py              ← Offline: train ML model (sudah ada)
├── build_vectorstore.py        ← Offline: embed paper ke vector (BARU)
├── run.py                      ← Online: serve Flask app
├── config.py                   ← Update: tambah MySQL + DeepSeek config
├── requirements.txt
├── models/
│   ├── churn_model.pkl
│   ├── label_encoders.pkl
│   └── feature_names.pkl
├── chroma_db/                  ← Output vector store (BARU, git-ignored)
├── data/
│   ├── customers.csv           ← Tetap sebagai seed data awal
│   └── papers/                 ← PDF paper churn (BARU)
│       ├── paper1.pdf
│       ├── paper2.pdf
│       └── ... (5-10 paper)
├── app/
│   ├── __init__.py
│   ├── routes.py               ← Update: tambah upload endpoint
│   ├── database.py             ← BARU: MySQL connection + SQLAlchemy models
│   ├── nlp/
│   │   ├── chat_engine.py      ← REWRITE: LLM sebagai otak utama
│   │   ├── intent_classifier.py ← Tetap: BiLSTM sebagai fast-path (opsional)
│   │   ├── rag_engine.py       ← BARU: ChromaDB retrieval
│   │   ├── llm_client.py       ← BARU: DeepSeek API + function calling
│   │   └── __init__.py
│   ├── services/
│   │   ├── customer_service.py ← UPDATE: baca dari MySQL bukan CSV
│   │   ├── predict_service.py  ← UPDATE: simpan hasil ke MySQL
│   │   └── __init__.py
│   └── chatbot_models/         ← Tetap: BiLSTM model files
└── venv/
```

---

## Task List (Urutan Implementasi)

### Phase 1: Database Setup (MySQL)
1. Install MySQL + PyMySQL + SQLAlchemy
2. Buat `database.py` dengan schema di atas
3. Buat script migrasi: import customers.csv → MySQL (seed data awal)
4. Update `customer_service.py` → baca dari MySQL bukan CSV
5. Update `predict_service.py` → simpan hasil prediksi ke MySQL
6. Buat endpoint `/api/upload` → parse CSV → upsert ke MySQL → run prediction
7. Handle duplikat: ON DUPLICATE KEY UPDATE

### Phase 2: Vector Store (Offline)
8. Kumpulkan 5-10 paper PDF tentang customer churn
9. Buat `build_vectorstore.py`:
   - Load PDF (PyPDF2/langchain)
   - Split ke chunks (800 chars, 100 overlap)
   - Embed pakai nomic-embed-text-v1.5
   - Simpan ke ChromaDB (persistent, file-based)
10. Jalankan sekali: `python build_vectorstore.py`

### Phase 3: LLM Integration (DeepSeek Flash)
11. Buat `llm_client.py`:
    - Setup OpenAI-compatible client dengan base_url DeepSeek
    - Define function/tools schema (get_customer, get_stats, search_papers, dll)
    - Handle function calling loop
12. Buat `rag_engine.py`:
    - Load ChromaDB saat startup
    - Fungsi `search_papers(query, k=4)` → return relevant chunks
13. Buat system prompt yang menginstruksikan LLM:
    - Kamu adalah asisten analisis churn
    - Jawab berdasarkan data pelanggan + riset ilmiah
    - Selalu sebutkan sumber (data dashboard / paper)

### Phase 4: Chatbot Rewrite
14. Rewrite `chat_engine.py`:
    - Opsional: BiLSTM fast-path untuk intent sederhana (confidence > 90%)
    - Default: Semua pertanyaan masuk ke LLM pipeline
    - LLM memahami pertanyaan → panggil tools → generate response
15. Simpan setiap conversation ke `chat_history` (MySQL)
16. Hapus semua hardcoded template response

### Phase 5: Frontend Update
17. Hapus komponen rekomendasi dari dashboard
18. Update chatbot widget (opsional: streaming response)
19. Tambah UI upload CSV
20. Pastikan chatbot menampilkan response markdown dengan baik

### Phase 6: Testing & Polish
21. Test: pertanyaan di luar intent list → harus bisa dijawab
22. Test: pertanyaan tentang data spesifik → harus akurat dari DB
23. Test: pertanyaan tentang strategi → harus reference paper
24. Test: upload CSV duplikat → data ter-update, tidak duplikat
25. Rate limiting untuk DeepSeek API calls

---

## Dependencies Baru (requirements.txt)

```
# Database (MySQL)
PyMySQL>=1.1
SQLAlchemy>=2.0
cryptography>=41.0  # untuk MySQL auth

# Vector Store & Embeddings
chromadb>=0.4
sentence-transformers>=2.2

# PDF Processing
PyPDF2>=3.0
langchain>=0.1
langchain-community>=0.1

# LLM (DeepSeek - OpenAI compatible)
openai>=1.0

# Existing (tetap)
flask
flask-cors
pandas
numpy
scikit-learn
joblib
tensorflow  # untuk BiLSTM (opsional fast-path)
```

---

## Config Baru (config.py)

```python
import os

# MySQL
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'churn_dashboard')
SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# DeepSeek LLM
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
DEEPSEEK_MODEL = 'deepseek-chat'  # atau deepseek-reasoner untuk reasoning

# ChromaDB
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), 'chroma_db')

# Embedding Model
EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5'

# Flask
DEBUG = True
HOST = '0.0.0.0'
PORT = 5000
```

---

## Catatan Penting

- **LLM memahami DAN menjawab** — ini yang membedakan dari sistem lama. Bukan hanya generate response, tapi juga memahami pertanyaan apapun tanpa batasan intent list.
- **Function calling** — LLM sendiri yang menentukan data apa yang perlu diambil. Tidak perlu hardcode logic "kalau intent X ambil data Y".
- **BiLSTM tetap ada** — sebagai optimasi (fast-path), bukan sebagai otak utama. Ini menunjukkan hybrid approach.
- **Paper cukup 5-10** — yang penting cover: faktor churn, strategi retensi, ML prediction.
- **Token hemat** — DeepSeek Flash sangat murah ($0.14/1M tokens). Untuk 100 chat/hari ≈ $0.01-0.02/hari.
- **MySQL dipilih** — lebih production-grade, support concurrent access, familiar untuk skripsi.
- **build_vectorstore.py dijalankan sekali** — seperti train_model.py, proses offline.

---

## Cara Pakai Planning Ini di Sesi Baru

Copy-paste atau reference file ini (`#PLANNING.md`) saat memulai sesi chat baru.
Mulai dari **Phase 1 (Database Setup)** karena semua phase lain bergantung padanya.
Setiap phase bisa dikerjakan dalam 1 sesi chat terpisah.
