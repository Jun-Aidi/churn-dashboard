# 🔮 ChurnPredict — Dashboard Prediksi Churn Pelanggan

> Sistem prediksi churn pelanggan berbasis Machine Learning dengan dashboard interaktif untuk memonitor, menganalisis, dan mencegah kehilangan pelanggan secara proaktif.

---

## 📋 Daftar Isi

- [Gambaran Umum](#-gambaran-umum)
- [Teknologi](#-teknologi)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Setup Backend (Python/Flask)](#2-setup-backend-pythonflask)
  - [3. Setup Frontend (React/Vite)](#3-setup-frontend-reactvite)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Fitur Aplikasi](#-fitur-aplikasi)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Gambaran Umum

**ChurnPredict** adalah aplikasi dashboard full-stack yang membantu bisnis memprediksi pelanggan mana yang berpotensi untuk berhenti berlangganan (churn). Sistem ini menggunakan model Machine Learning untuk menghasilkan **skor risiko (0–100)** bagi setiap pelanggan dan memberikan **rekomendasi aksi** yang perlu diambil.

| Skor | Kategori | Status |
|------|----------|--------|
| 66–100 | 🔴 Risiko Tinggi | Urgent — Segera tangani |
| 31–65  | 🟡 Risiko Sedang | Monitor — Pantau secara berkala |
| 0–30   | 🟢 Risiko Rendah | Stabil — Pertahankan layanan |

---

## 🛠 Teknologi

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 18 | UI Framework |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 3 | Styling |
| Recharts | 2 | Chart & visualisasi data |
| React Router | 6 | Routing antar halaman |
| Lucide React | — | Icon library |

### Backend
| Teknologi | Kegunaan |
|-----------|----------|
| Python 3.10+ | Bahasa pemrograman utama |
| Flask | Web framework / REST API |
| scikit-learn | Model Machine Learning |
| pandas | Pengolahan data |
| numpy | Komputasi numerik |

---

## 📁 Struktur Proyek

```
churn-dashboard/
├── README.md
├── frontend/                   # Aplikasi React
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx            # Entry point React
│       ├── App.jsx             # Router & layout utama
│       ├── index.css           # Global styles
│       ├── api/
│       │   └── index.js        # Koneksi API & mock data
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Layout.jsx  # Wrapper layout
│       │   │   ├── Sidebar.jsx # Navigasi sidebar
│       │   │   └── Navbar.jsx  # Header halaman
│       │   ├── charts/
│       │   │   ├── ChurnTrendChart.jsx  # Area chart tren
│       │   │   ├── RiskDonutChart.jsx   # Donut chart distribusi
│       │   │   └── ModelCompareChart.jsx
│       │   └── ui/
│       │       ├── StatCard.jsx
│       │       ├── Badge.jsx
│       │       ├── Table.jsx
│       │       └── LoadingSpinner.jsx
│       └── pages/
│           ├── Dashboard.jsx       # Halaman utama
│           ├── Customers.jsx       # Daftar pelanggan
│           ├── CustomerDetail.jsx  # Detail pelanggan
│           ├── Predict.jsx         # Form prediksi manual
│           └── ModelComparison.jsx # Perbandingan model ML
└── backend/                    # REST API Python/Flask
    ├── run.py                  # Entry point server
    ├── config.py               # Konfigurasi aplikasi
    ├── requirements.txt        # Dependencies Python
    ├── app/
    │   ├── __init__.py
    │   ├── routes/
    │   │   ├── customers.py    # Endpoint data pelanggan
    │   │   ├── predict.py      # Endpoint prediksi
    │   │   └── models.py       # Endpoint model ML
    │   └── utils/
    ├── ml/
    │   ├── predict.py          # Logika prediksi ML
    │   ├── models/             # File model terlatih (.pkl)
    │   └── train/              # Script training model
    └── data/                   # Dataset
```

---

## ✅ Prasyarat

Pastikan software berikut sudah terinstal di komputer Anda sebelum memulai:

### Wajib
- **Node.js** v18 atau lebih baru → [Download Node.js](https://nodejs.org/)
- **Python** 3.10 atau lebih baru → [Download Python](https://www.python.org/downloads/)
- **Git** → [Download Git](https://git-scm.com/downloads)

### Verifikasi Instalasi

Buka **Terminal** / **PowerShell** dan jalankan perintah berikut:

```bash
node --version      # Harus menampilkan v18.x.x atau lebih baru
npm --version       # Harus menampilkan 9.x.x atau lebih baru
python --version    # Harus menampilkan Python 3.10.x atau lebih baru
git --version       # Harus menampilkan git version x.x.x
```

> **⚠️ Catatan untuk Windows**: Jika `python` tidak dikenali, coba `python3`. Jika `git` tidak dikenali, instal Git dan restart terminal.

---

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/<username>/churn-dashboard.git
cd churn-dashboard
```

> **Jika belum ada Git**, unduh file ZIP dari GitHub lalu ekstrak ke folder pilihan Anda.

---

### 2. Setup Backend (Python/Flask)

#### Langkah 2a — Masuk ke folder backend

```bash
cd backend
```

#### Langkah 2b — Buat Virtual Environment

Virtual environment mengisolasi dependency Python agar tidak bentrok dengan proyek lain.

```bash
# Windows
python -m venv venv

# macOS / Linux
python3 -m venv venv
```

#### Langkah 2c — Aktifkan Virtual Environment

```bash
# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Windows (Command Prompt)
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate
```

> ✅ Jika berhasil, nama environment `(venv)` akan muncul di awal baris terminal.

#### Langkah 2d — Install Dependencies Python

```bash
pip install -r requirements.txt
```

Paket utama yang akan diinstal:
- `flask` — Web framework
- `flask-cors` — Menangani CORS untuk komunikasi dengan frontend
- `scikit-learn` — Model Machine Learning
- `pandas` — Pengolahan data
- `numpy` — Komputasi numerik
- `joblib` — Menyimpan/memuat model ML

#### Langkah 2e — (Opsional) Training Model ML

Jika file model belum tersedia di `backend/ml/models/`:

```bash
python ml/train/train_model.py
```

---

### 3. Setup Frontend (React/Vite)

Buka **terminal baru** (jangan tutup terminal backend).

#### Langkah 3a — Masuk ke folder frontend

```bash
# Dari root proyek
cd frontend
```

#### Langkah 3b — Install Dependencies Node.js

```bash
npm install
```

Proses ini akan mengunduh semua package yang tertera di `package.json` ke folder `node_modules/`.

> ⏳ Proses ini mungkin memakan waktu 1–3 menit tergantung koneksi internet.

---

## ▶️ Menjalankan Aplikasi

Aplikasi ini terdiri dari **dua server** yang harus dijalankan secara bersamaan.

### Terminal 1 — Jalankan Backend

```bash
cd backend

# Aktifkan virtual environment terlebih dahulu (jika belum)
# Windows:
venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Jalankan server Flask
python run.py
```

Server backend akan berjalan di: **http://localhost:5000**

### Terminal 2 — Jalankan Frontend

```bash
cd frontend
npm run dev
```

Server frontend akan berjalan di: **http://localhost:5173** (atau port lain jika sudah dipakai)

### Akses Aplikasi

Buka browser dan kunjungi:

```
http://localhost:5173
```

---

## 🗂 Fitur Aplikasi

| Halaman | Route | Deskripsi |
|---------|-------|-----------|
| **Dashboard** | `/` | Ringkasan statistik, grafik tren & distribusi risiko, tabel pelanggan |
| **Pelanggan** | `/customers` | Daftar semua pelanggan dengan kartu risiko, filter & pencarian |
| **Detail Pelanggan** | `/customers/:id` | Analisis mendalam faktor churn & rekomendasi aksi AI |
| **Prediksi Manual** | `/predict` | Input data pelanggan baru → prediksi skor risiko real-time |
| **Perbandingan Model** | `/model` | Evaluasi performa model ML (Accuracy, Precision, Recall, AUC) |

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/customers` | Ambil semua data pelanggan |
| `GET` | `/api/customers/:id` | Ambil data 1 pelanggan |
| `POST` | `/api/predict` | Prediksi skor churn dari input data |
| `GET` | `/api/models` | Info performa model ML |

### Contoh Request Prediksi

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tenure": 12,
    "usage": 15.5,
    "adoption": 45.0,
    "tickets": 3,
    "lastLogin": 20,
    "nps": 5,
    "delay": 1,
    "contract": "Monthly",
    "plan": "Starter"
  }'
```

### Contoh Response

```json
{
  "score": 52,
  "risk": "med",
  "label": "Risiko Sedang",
  "factors": [
    { "name": "Adopsi Fitur Kurang Optimal", "impact": 16 },
    { "name": "Penggunaan Produk Rendah", "impact": 15 }
  ]
}
```

---

## 🔧 Troubleshooting

### ❌ `npm install` gagal / error EACCES

```bash
# Hapus cache npm lalu coba lagi
npm cache clean --force
npm install
```

### ❌ `python -m venv venv` gagal di Windows

Pastikan Python ditambahkan ke PATH saat instalasi. Centang opsi **"Add Python to PATH"** saat menginstal Python.

### ❌ Port 5173 atau 5000 sudah digunakan

Frontend Vite otomatis mencoba port berikutnya (5174, 5175, dst.).
Untuk backend, ubah port di `config.py`:

```python
PORT = 5001  # Ganti ke port yang tersedia
```

### ❌ CORS Error di browser

Pastikan `flask-cors` sudah terinstal dan dikonfigurasi di backend:

```python
from flask_cors import CORS
CORS(app)
```

### ❌ `venv\Scripts\Activate.ps1` ditolak di PowerShell

```powershell
# Jalankan perintah ini sekali sebagai Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 👨‍💻 Pengembang

Dikembangkan sebagai proyek **PBL (Project-Based Learning)** Semester 6.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik.
