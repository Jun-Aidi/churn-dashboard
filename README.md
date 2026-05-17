# 🔮 ChurnPredict — Dashboard Prediksi Churn Pelanggan

> Aplikasi dashboard berbasis React + Flask untuk memonitor, menganalisis, dan mencegah kehilangan pelanggan secara proaktif menggunakan model Machine Learning dan NLP chatbot.

---

## 📋 Daftar Isi

- [Gambaran Umum](#-gambaran-umum)
- [Arsitektur](#-arsitektur)
- [Teknologi](#-teknologi)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat](#-prasyarat)
- [Instalasi & Menjalankan](#-instalasi--menjalankan)
- [Fitur Aplikasi](#-fitur-aplikasi)
- [Dark Mode](#-dark-mode)
- [NLP Chatbot Engine](#-nlp-chatbot-engine)
- [Pengembang](#-pengembang)

---

## 🌟 Gambaran Umum

**ChurnPredict** adalah dashboard interaktif yang membantu bisnis memantau pelanggan mana yang berpotensi churn (berhenti berlangganan).

Setiap pelanggan mendapatkan **skor risiko (0–100)** yang dihitung berdasarkan faktor-faktor seperti keaktifan login, jumlah tiket support, NPS score, dan lama berlangganan.

| Skor | Kategori | Status |
|------|----------|--------|
| 66–100 | 🔴 Risiko Tinggi | Urgent — Segera tangani |
| 31–65  | 🟡 Risiko Sedang | Monitor — Pantau secara berkala |
| 0–30   | 🟢 Risiko Rendah | Stabil — Pertahankan layanan |

---

## 🏗 Arsitektur

```
┌─────────────────┐         ┌─────────────────────────────────┐
│   Frontend      │  HTTP   │          Backend (Flask)         │
│   (React)       │ ──────► │                                 │
│                 │         │  ┌───────────────────────────┐  │
│  CopilotWidget  │ POST    │  │   NLP Engine              │  │
│  → /api/chat    │ ──────► │  │  - Stemming (Sastrawi)    │  │
│                 │         │  │  - Word Embeddings        │  │
│  Dashboard      │ GET     │  │  - Intent Classifier      │  │
│  → /api/customers──────► │  └───────────────────────────┘  │
│                 │         │  ┌───────────────────────────┐  │
│                 │ ◄────── │  │   ML Model (.pkl)         │  │
│                 │  JSON   │  │  - Random Forest          │  │
└─────────────────┘         │  │  - Scikit-learn           │  │
                            │  └───────────────────────────┘  │
                            │  ┌───────────────────────────┐  │
                            │  │   Data Layer (Pandas)     │  │
                            │  │  - customers.csv          │  │
                            │  └───────────────────────────┘  │
                            └─────────────────────────────────┘
```

**Kenapa Flask?**
- Micro-framework ringan — cocok untuk API yang fokus serve model ML
- Standar industri untuk deployment model scikit-learn/pkl
- Kompatibel langsung dengan Sastrawi, pandas, numpy, scikit-learn
- Cepat di-setup (2-3 endpoint cukup untuk project ini)
- Frontend-agnostic — serve JSON, bisa dipanggil dari React/Vue/Mobile

---

## 🛠 Teknologi

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 18 | UI Framework |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Recharts | 2 | Chart & visualisasi data |
| React Router | 6 | Client-side routing |

### Backend
| Teknologi | Kegunaan |
|-----------|----------|
| Flask | Web framework (REST API) |
| Flask-CORS | Cross-origin resource sharing |
| Pandas | Data processing & analysis |
| Scikit-learn | Machine learning model |
| Sastrawi | Indonesian NLP stemmer (Nazief-Adriani) |
| NumPy | Numerical computing |
| Joblib | Model serialization (.pkl) |

---

## 📁 Struktur Proyek

```
churn-dashboard/
├── README.md
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/index.js             # Mock data (fallback jika backend mati)
│       ├── components/
│       │   ├── copilot/
│       │   │   ├── CopilotWidget.jsx  # UI chatbot
│       │   │   ├── chatEngine.js      # API client → backend
│       │   │   └── nlpEngine.js       # Local NLP fallback
│       │   ├── charts/
│       │   ├── layout/
│       │   └── ui/
│       └── pages/
│
└── backend/
    ├── venv/                    # Virtual environment (JANGAN commit)
    ├── run.py                   # Entry point Flask
    ├── config.py                # Konfigurasi path
    ├── requirements.txt         # Python dependencies
    ├── data/
    │   └── customers.csv        # Dataset pelanggan
    ├── models/
    │   └── churn_model.pkl      # Model ML (taruh file .pkl di sini)
    └── app/
        ├── __init__.py          # Flask app factory
        ├── routes.py            # API endpoints
        ├── nlp/
        │   ├── stemmer.py       # Indonesian stemmer (Sastrawi)
        │   ├── preprocessor.py  # Tokenize, stopwords, synonyms, n-grams
        │   ├── intent_classifier.py  # Word embeddings + neural classifier
        │   └── chat_engine.py   # Response generator
        └── services/
            └── customer_service.py  # Data access layer (pandas)
```

---

## ✅ Prasyarat

- **Node.js** v18+ → [Download](https://nodejs.org/)
- **Python** 3.10+ → [Download](https://www.python.org/downloads/)
- **Git** → [Download](https://git-scm.com/downloads)

### Verifikasi

```bash
node --version     # v18.x.x atau lebih baru
npm --version      # 9.x.x atau lebih baru
python --version   # 3.10.x atau lebih baru
```

---

## 🚀 Instalasi & Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/<username>/churn-dashboard.git
cd churn-dashboard
```

### 2. Setup Backend (Python + Flask)

```bash
cd backend

# Buat virtual environment
python -m venv venv

# Aktivasi virtual environment
# Windows (CMD):
venv\Scripts\activate
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Jalankan backend server
python run.py
```

Backend akan berjalan di: **http://localhost:5000**

> ⚠️ **Penting:** Selalu gunakan virtual environment, jangan install ke global Python.

### 3. Setup Frontend (React + Vite)

Buka terminal baru:

```bash
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Frontend akan berjalan di: **http://localhost:5173**

---

### Menjalankan Keduanya (Ringkasan)

Terminal 1 — Backend:
```bash
cd backend
.\venv\Scripts\Activate.ps1    # atau: source venv/bin/activate
python run.py
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

> 💡 Jika backend tidak berjalan, chatbot akan otomatis fallback ke mode offline (NLP lokal di browser).

---

## 🗂 Fitur Aplikasi

| Halaman | Route | Deskripsi |
|---------|-------|-----------|
| **Dashboard** | `/` | Ringkasan statistik, grafik tren & distribusi risiko |
| **Pelanggan** | `/customers` | Grid kartu semua pelanggan dengan filter & pencarian |
| **Detail Pelanggan** | `/customers/:id` | Analisis faktor churn & rekomendasi aksi |
| **Prediksi Manual** | `/predict` | Input data → hitung skor risiko |
| **Perbandingan Model** | `/model` | Metrik evaluasi model ML |

### API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/chat` | Kirim pesan ke chatbot NLP |
| GET | `/api/customers` | Ambil semua data pelanggan |
| GET | `/api/customers/<id>` | Detail satu pelanggan |
| GET | `/api/customers/stats` | Statistik ringkasan |

---

## 🤖 NLP Chatbot Engine

Chatbot **Ghosting** menggunakan pipeline NLP berbasis Deep Learning:

1. **Tokenization & Normalization** — Lowercase, punctuation removal
2. **Indonesian Stemming** — Sastrawi (algoritma Nazief-Adriani)
3. **Stopword Removal** — 60+ stopwords Indonesia & Inggris
4. **Synonym Expansion** — 20+ grup sinonim, 200+ kata
5. **Word Embeddings** — 16-dimensi dense vectors (semantic category-based)
6. **TF-IDF Vectorization** — Term frequency-inverse document frequency
7. **Cosine Similarity** — Mengukur kemiripan semantik
8. **Fuzzy Matching** — Levenshtein distance (toleransi typo)
9. **N-gram Matching** — Bigram & trigram overlap
10. **Multi-signal Neural Classifier** — 5 sinyal scoring (embedding 30%, keyword 25%, phrase similarity 25%, context 15%, n-gram 5%)

**Contoh pertanyaan yang dipahami:**
- "Apa faktor utama churn?" / "Fitur yang paling mempengaruhi churn" / "Kenapa pelanggan cabut"
- "Siapa VIP yang berisiko?" / "Customer premium yang mau pergi"
- "Berapa pelanggan risiko tinggi?" / "Total customer kritis"
- "Analisis C-0001" / "Cek profil customer"
- "Buat email untuk C-0003" / "Draft penawaran"
- "Strategi retensi" / "Gimana biar churn turun"

---

## 🌙 Dark Mode

Klik ikon 🌙/☀️ di navbar. Preferensi disimpan di `localStorage` dan mendeteksi preferensi sistem.

---

## 👨‍💻 Pengembang

Dikembangkan sebagai proyek **PBL (Project-Based Learning)** Semester 6.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik.
