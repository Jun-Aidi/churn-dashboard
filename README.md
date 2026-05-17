# 🔮 ChurnPredict — Dashboard Prediksi Churn Pelanggan

> Aplikasi dashboard frontend-only berbasis React untuk memonitor, menganalisis, dan mencegah kehilangan pelanggan secara proaktif menggunakan skor risiko churn berbasis rule-based scoring.

---

## 📋 Daftar Isi

- [Gambaran Umum](#-gambaran-umum)
- [Teknologi](#-teknologi)
- [Struktur Proyek](#-struktur-proyek)
- [Prasyarat](#-prasyarat)
- [Instalasi & Menjalankan](#-instalasi--menjalankan)
- [Fitur Aplikasi](#-fitur-aplikasi)
- [Dark Mode](#-dark-mode)
- [Data & Prediksi Lokal](#-data--prediksi-lokal)
- [Pengembang](#-pengembang)

---

## 🌟 Gambaran Umum

**ChurnPredict** adalah dashboard interaktif yang membantu bisnis memantau pelanggan mana yang berpotensi churn (berhenti berlangganan). Aplikasi ini berjalan **sepenuhnya di sisi frontend** — tidak memerlukan backend atau API eksternal.

Setiap pelanggan mendapatkan **skor risiko (0–100)** yang dihitung berdasarkan faktor-faktor seperti keaktifan login, jumlah tiket support, NPS score, dan lama berlangganan.

| Skor | Kategori | Status |
|------|----------|--------|
| 66–100 | 🔴 Risiko Tinggi | Urgent — Segera tangani |
| 31–65  | 🟡 Risiko Sedang | Monitor — Pantau secara berkala |
| 0–30   | 🟢 Risiko Rendah | Stabil — Pertahankan layanan |

---

## 🛠 Teknologi

| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 18 | UI Framework |
| Vite | 6 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Font Awesome | 6.5.1 | Icon library (via CDN) |
| Recharts | 2 | Chart & visualisasi data |
| React Router | 6 | Client-side routing |

---

## 📁 Struktur Proyek

```
churn-dashboard/
├── README.md
├── frontend/
│   ├── index.html              # Entry HTML + Font Awesome CDN
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js      # Konfigurasi Tailwind + CSS vars
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx            # Entry point + ThemeProvider
│       ├── App.jsx             # Router & route definitions
│       ├── index.css           # Global styles & CSS custom properties
│       ├── api/
│       │   └── index.js        # Data mock pelanggan & logika scoring lokal
│       ├── contexts/
│       │   └── ThemeContext.jsx # Dark/light mode state & toggle
│       ├── hooks/
│       │   ├── useCustomers.js  # Hook data pelanggan (dari mock)
│       │   └── useTrend.js      # Hook data tren churn
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Layout.jsx   # Wrapper layout utama
│       │   │   ├── Sidebar.jsx  # Navigasi sidebar (ikon FA)
│       │   │   └── Navbar.jsx   # Header + tombol dark mode
│       │   ├── charts/
│       │   │   ├── ChurnTrendChart.jsx   # Area chart tren 6 bulan
│       │   │   ├── RiskDonutChart.jsx    # Donut chart distribusi risiko
│       │   │   └── ModelCompareChart.jsx # Bar chart performa model
│       │   ├── copilot/
│       │   │   ├── CopilotWidget.jsx     # Chatbot Astra (FAB)
│       │   │   └── chatEngine.js         # Logika rule-based NLP
│       │   └── ui/
│       │       ├── Badge.jsx        # Badge risiko (Tinggi/Sedang/Rendah)
│       │       └── Table.jsx        # Tabel pelanggan interaktif
│       └── pages/
│           ├── Dashboard.jsx        # Halaman utama & ringkasan
│           ├── Customers.jsx        # Daftar pelanggan (grid kartu)
│           ├── CustomerDetail.jsx   # Detail & faktor risiko pelanggan
│           ├── Predict.jsx          # Form prediksi risiko manual
│           └── ModelComparison.jsx  # Evaluasi performa model RF
└── backend/                    # (Tidak aktif — disimpan sebagai referensi)
    └── ...
```

---

## ✅ Prasyarat

- **Node.js** v18 atau lebih baru → [Download Node.js](https://nodejs.org/)
- **Git** → [Download Git](https://git-scm.com/downloads)

### Verifikasi

```bash
node --version    # v18.x.x atau lebih baru
npm --version     # 9.x.x atau lebih baru
```

---

## 🚀 Instalasi & Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/<username>/churn-dashboard.git
cd churn-dashboard
```

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Jalankan Dev Server

```bash
npm run dev
```

Buka browser dan akses: **http://localhost:5173**

> ✅ Tidak perlu menjalankan backend. Aplikasi langsung berjalan dengan data mock bawaan.

---

## 🗂 Fitur Aplikasi

| Halaman | Route | Deskripsi |
|---------|-------|-----------|
| **Dashboard** | `/` | Ringkasan statistik, grafik tren & distribusi risiko, tabel pelanggan |
| **Pelanggan** | `/customers` | Grid kartu semua pelanggan dengan filter risiko & pencarian |
| **Detail Pelanggan** | `/customers/:id` | Analisis faktor churn & rekomendasi aksi retention |
| **Prediksi Manual** | `/predict` | Input data pelanggan → hitung skor risiko secara lokal |
| **Perbandingan Model** | `/model` | Metrik evaluasi model Random Forest (Accuracy, Precision, Recall, AUC) |

### Astra — CS Copilot

Tombol 🚀 di pojok kanan bawah membuka chatbot **Astra**, asisten cerdas berbasis rule-based NLP yang dapat menjawab pertanyaan seputar faktor risiko, strategi retention, dan data pelanggan.

---

## 🌙 Dark Mode

Aplikasi mendukung **dark mode** penuh. Klik ikon 🌙 / ☀️ di navbar untuk beralih mode.

- Preferensi disimpan otomatis di `localStorage`
- Mendeteksi preferensi sistem (`prefers-color-scheme`) saat pertama kali dibuka
- Semua komponen (kartu, tabel, chart, chatbot, badge) mendukung kedua mode

---

## 📊 Data & Prediksi Lokal

Seluruh data dan logika scoring berjalan di client-side:

- **Data pelanggan** → `frontend/src/api/index.js` (array mock `customers`)
- **Skor risiko** → fungsi `localPredict()` di `Predict.jsx` dan `computeChurnScore()` di `api/index.js`
- **Faktor churn** → fungsi `getFactors()` di `api/index.js`
- **Rekomendasi** → fungsi `getRecos()` di `api/index.js`

Untuk menambah/mengubah data pelanggan, edit array `customers` di `src/api/index.js`.

---

## 👨‍💻 Pengembang

Dikembangkan sebagai proyek **PBL (Project-Based Learning)** Semester 6.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademik.
