# 🚀 Optimasi Performa: Mengurangi Delay Loading Dashboard & Pelanggan

> Dokumen ini sudah disesuaikan dengan kode yang ada sekarang (Juni 2026).
> Referensi baris/file diverifikasi langsung terhadap source, bukan asumsi.

## 📊 Analisis Masalah (Berdasarkan Kode Aktual)

### 🔴 AKAR MASALAH UTAMA: Service di-instansiasi ulang & query penuh per request

Ini penyebab delay terbesar dan **tidak tercakup di rencana lama**.

**Lokasi**: `backend/app/routes/main_routes.py` (endpoint `/customers`, `/customers/stats`, `/trend`)

Setiap endpoint membuat `CustomerService(user_id=g.current_user.id)` baru:
```python
@customers_bp.route('/customers', methods=['GET'])
def get_customers():
    service = CustomerService(user_id=g.current_user.id)   # <-- _load_data() jalan lagi
    customers = service.get_all_customers()
    return jsonify(customers)
```

`CustomerService.__init__` memanggil `_load_data()` yang:
1. Query **seluruh** baris `customers` milik user (`session.query(Customer)...all()`).
2. Membangun list-of-dict lalu `pd.DataFrame(rows)` dari nol.
3. Berpotensi menjalankan prediksi + menulis balik ke DB (lihat masalah di bawah).

**Dampak pada halaman Dashboard** (`frontend/src/pages/Dashboard.jsx`):
- `useCustomers()` → `GET /api/customers`
- `ChurnTrendChart` → `useTrend()` → `GET /api/trend`
- `FeatureImportanceChart` → `GET /api/feature-importance`

Artinya membuka Dashboard = **minimal 2x full-table load + 2x build DataFrame** untuk data yang sama. Membuka halaman **Pelanggan** mengulang sekali lagi. Inilah sumber "loading lama".

---

### 🔴 Bug logika prediksi di jalur GET

**Lokasi**: `backend/app/services/customer_service.py` → `_load_data()`
```python
risk_score_series = self.df['risk_score'].isna()
if bool(risk_score_series.all()) or bool(risk_score_series.any()):
    self.df = _predict_dataframe(self.df)
    self._update_risk_in_db(session)
```
- `all() or any()` praktis berarti: **jika ada SATU saja** `risk_score` NaN, seluruh baris diprediksi ulang.
- `_predict_dataframe` menjalankan feature engineering + `model.predict_proba` untuk **semua** baris.
- `_update_risk_in_db` menulis balik **satu per satu dalam loop** (`UPDATE` per baris) di tengah request `GET`.
- Sebuah GET seharusnya tidak menulis ke DB. Ini lambat dan rapuh.

---

### 🟠 Konversi DataFrame → dict baris per baris

**Lokasi**: `customer_service.py` → `get_all_customers()`, `_customer_to_dict()`
```python
return [self._customer_to_dict(row) for _, row in self.df.iterrows()]
```
- `df.iterrows()` lambat untuk dataset besar; tiap baris memanggil banyak `row.get(...)` + cast.
- Dipanggil ulang tiap request karena tidak ada cache.

---

### 🟠 Frontend: fetch semua data lalu di-slice di client

**Lokasi**: `frontend/src/hooks/useCustomers.js` + `frontend/src/pages/Customers.jsx`
- `useCustomers()` fetch **seluruh** customer (tanpa pagination param).
- `Customers.jsx` & `Dashboard.jsx` hanya menampilkan `.slice(0, 100)` / `.slice(0, 10)` — sisanya di-fetch percuma.
- Tidak ada cache antar-navigasi: pindah halaman = fetch ulang dari awal (`useEffect` + `useState`).

---

### 🟡 Tidak ada kompresi response

**Lokasi**: `backend/app/__init__.py` (`create_app`) — hanya `CORS(app)`, tidak ada gzip.
- Response JSON daftar customer dikirim tanpa kompresi.

---

### 🟡 Connection pool & index (sekunder)

**Lokasi**: `backend/app/database.py` → `init_db()`
```python
engine = create_engine(config.SQLALCHEMY_DATABASE_URI,
    pool_size=10, max_overflow=20, pool_recycle=3600, echo=False)
```
- Tidak ada `pool_pre_ping=True` (koneksi mati bisa bikin error/lag pertama).
- Tabel `customers` punya index di `customer_id` + unique `(user_id, customer_id)`, tapi belum ada index untuk filter umum (`user_id`, `risk_class`).

### ✅ Yang sudah benar (jangan diutak-atik)
- Model bundle di-load **sekali** di level modul (`customer_service.py` baris ~19). Sudah optimal.
- Tidak ada lagi fallback CSV di runtime (sudah dihapus; data hanya via `/api/upload`).

---

## 🎯 Solusi Berdasarkan Prioritas Dampak

### **TIER 1 — Dampak Tertinggi, Effort Rendah** ⚡

#### 1.1 Hentikan instansiasi & query berulang dalam satu request
**Impact**: 🔥🔥🔥 — ini perbaikan terbesar untuk keluhan "loading lama".

**Pendekatan A (paling cepat): cache per-user dengan TTL pendek.**
Buat `backend/app/services/customer_cache.py`:
```python
import time

class CustomerDataCache:
    """Cache DataFrame customer per user dengan TTL pendek."""
    def __init__(self, ttl_seconds=60):
        self._store = {}          # user_id -> (df, timestamp)
        self._ttl = ttl_seconds

    def get(self, user_id):
        entry = self._store.get(user_id)
        if entry:
            df, ts = entry
            if time.time() - ts < self._ttl:
                return df
            del self._store[user_id]
        return None

    def set(self, user_id, df):
        self._store[user_id] = (df, time.time())

    def invalidate(self, user_id=None):
        if user_id is None:
            self._store.clear()
        else:
            self._store.pop(user_id, None)

customer_data_cache = CustomerDataCache(ttl_seconds=60)
```
Di `CustomerService._load_data()`: cek cache dulu, kalau ada pakai; kalau tidak, query + simpan ke cache. **Invalidasi** cache user di `add_customer()` dan di endpoint `/api/upload` setelah insert.

> Efek: membuka Dashboard yang memanggil `/customers` + `/trend` hanya query DB **sekali** (yang kedua ambil dari cache), bukan dua kali full-load.

**Pendekatan B (lebih bersih, opsional): satu service per request via Flask `g`.**
Simpan instance di `g._customer_service` agar dipakai ulang dalam request yang sama. Berguna kalau nanti satu request memanggil beberapa method.

#### 1.2 Keluarkan prediksi dari jalur GET
**Impact**: 🔥🔥🔥

- Prediksi risk_score **hanya** saat data masuk: di `add_customer()` (sudah) dan di endpoint `/api/upload`.
- Di `_load_data()`, hapus prediksi + `_update_risk_in_db` dari GET. Kalau tetap mau jaring pengaman untuk baris NaN, prediksi **hanya baris yang NaN** dan jangan tulis balik saat GET:
```python
needs_pred = self.df['risk_score'].isna()
if needs_pred.any():
    predicted = _predict_dataframe(self.df[needs_pred].copy())
    self.df.loc[needs_pred, 'risk_score'] = predicted['risk_score'].values
    self.df.loc[needs_pred, 'risk_class'] = predicted['risk_class'].values
    # TODO: jadwalkan update DB di luar request (atau saat upload), bukan di sini
```

#### 1.3 Aktifkan kompresi gzip
**Impact**: 🔥🔥 (transfer JSON lebih kecil)

Install: `pip install flask-compress` (tambahkan ke `backend/requirements.txt`).
Di `backend/app/__init__.py`:
```python
from flask_compress import Compress

def create_app():
    app = Flask(__name__)
    CORS(app)
    Compress(app)        # gzip otomatis untuk response > 500 byte
    app.config['COMPRESS_MIMETYPES'] = ['application/json', 'text/html', 'text/css', 'application/javascript']
    app.config['COMPRESS_LEVEL'] = 6
    app.config['COMPRESS_MIN_SIZE'] = 500
    ...
```

#### 1.4 Percepat konversi baris → dict
**Impact**: 🔥🔥

- Ganti `df.iterrows()` dengan `df.to_dict('records')` lalu map per dict (jauh lebih cepat dari `iterrows`), atau vektorisasi kolom turunan (`tenure_months`, `monthly_revenue`) dengan operasi pandas sebelum konversi.

---

### **TIER 2 — Penting, Effort Sedang** 🔶

#### 2.1 Pagination + filter di backend (kalau jumlah customer per user besar)
**Impact**: 🔥🔥 jika ratusan–ribuan baris; 🔥 kalau hanya puluhan.

Tambah method di `CustomerService`:
```python
def get_customers_paginated(self, page=1, per_page=50, risk_filter=None) -> dict:
    if self.df is None or self.df.empty:
        return {'customers': [], 'total': 0, 'page': page, 'per_page': per_page, 'pages': 0}
    df = self.df if not risk_filter else self.df[self.df['risk_class'] == risk_filter]
    total = len(df)
    start, end = (page - 1) * per_page, (page - 1) * per_page + per_page
    rows = df.iloc[start:end]
    return {
        'customers': [self._customer_to_dict(r) for _, r in rows.iterrows()],
        'total': total, 'page': page, 'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    }
```
Update route `/customers` untuk baca `page`, `per_page`, `risk` dari `request.args`.
> Catatan: counts per kategori (high/med/low) untuk tab harus tetap dihitung dari total, bukan dari halaman aktif — sediakan via `/customers/stats` agar tab `Customers.jsx` tetap akurat.

#### 2.2 Frontend: cache & hindari fetch ulang antar-navigasi
**Impact**: 🔥🔥

Dua opsi:
- **Ringan (tanpa dependency baru)**: angkat data customer ke sebuah context/provider yang di-fetch sekali, dipakai Dashboard & Pelanggan. Hindari fetch ulang tiap mount.
- **Standar industri**: pasang `@tanstack/react-query` (`npm install @tanstack/react-query`), bungkus app dengan `QueryClientProvider`, ubah `useCustomers`/`useTrend` jadi `useQuery` dengan `staleTime` ~5 menit dan `refetchOnWindowFocus: false`.

Jika backend sudah pagination (2.1), `useCustomers(page, perPage, riskFilter)` kirim param ke `fetchCustomers`.

#### 2.3 Tambah index DB untuk pola query umum
**Impact**: 🔥

Di model `Customer` (`database.py`), tambahkan:
```python
__table_args__ = (
    UniqueConstraint('user_id', 'customer_id', name='uq_user_customer'),
    Index('idx_user_risk', 'user_id', 'risk_class'),
)
```
(Filter utama selalu `user_id`, jadi index gabungan `user_id, risk_class` paling relevan.)

#### 2.4 Lazy-load komponen chart
**Impact**: 🔥 (initial paint lebih cepat)

Di `Dashboard.jsx`:
```javascript
import { lazy, Suspense } from 'react';
const ChurnTrendChart = lazy(() => import('../components/charts/ChurnTrendChart'));
const FeatureImportanceChart = lazy(() => import('../components/charts/FeatureImportanceChart'));
// bungkus render-nya dengan <Suspense fallback={...}>
```

---

### **TIER 3 — Opsional / Skala Produksi** 🔷

#### 3.1 `pool_pre_ping` & tuning pool
Di `init_db()`:
```python
engine = create_engine(config.SQLALCHEMY_DATABASE_URI,
    pool_size=10, max_overflow=20, pool_recycle=1800,
    pool_pre_ping=True, echo=False)
```
`pool_pre_ping=True` murah dan menghindari error koneksi basi (sering terasa sebagai "lag di request pertama").

#### 3.2 Virtual scrolling (hanya jika benar-benar render ribuan kartu)
`Customers.jsx` saat ini sudah `.slice(0, 100)`. Virtual scrolling (`react-window`) baru perlu kalau ingin menampilkan jauh lebih banyak tanpa pagination. Untuk sekarang umumnya **belum perlu**.

#### 3.3 Redis / WebSocket / CDN
Belum relevan untuk skala saat ini. Tunda sampai ada kebutuhan multi-instance atau real-time. Memasukkannya sekarang = over-engineering.

---

## 🛠️ Roadmap yang Disarankan

### Fase 1 — Quick Wins (½–1 hari) ← kerjakan ini dulu
1. Cache data customer per-user + invalidasi saat upload/add (1.1).
2. Keluarkan prediksi & write-back dari GET (1.2).
3. Aktifkan gzip (1.3).
4. Ganti `iterrows()` → `to_dict('records')` (1.4).

### Fase 2 — Frontend & Query (1–2 hari)
1. Cache frontend (context atau React Query) (2.2).
2. Pagination backend + integrasi frontend bila data besar (2.1).
3. Lazy-load chart (2.4).
4. Index DB (2.3).

### Fase 3 — Pemantapan (opsional)
1. `pool_pre_ping` (3.1).
2. Virtual scrolling jika diperlukan (3.2).

---

## 🧪 Cara Verifikasi

- **Network tab**: hitung jumlah request & ukuran response saat buka Dashboard sebelum/sesudah. Target: `/customers` & `/trend` tidak lagi memicu dua full-load DB.
- **Log backend**: tambahkan timing sederhana di `_load_data()` untuk konfirmasi query DB berkurang.
- **Cek gzip**: response header `Content-Encoding: gzip` muncul untuk `/api/customers`.
- **TTFB** `/api/customers` turun signifikan setelah cache + hapus prediksi dari GET.

---

## 📝 Catatan Konsistensi Data

- Cache TTL pendek (≈60 dtk) + invalidasi eksplisit saat `add_customer` / upload menjaga data tetap fresh tanpa stale lama.
- Pastikan counts tab di `Customers.jsx` dihitung dari total (via `/stats`), bukan dari satu halaman, agar angka di tab tetap benar saat pagination aktif.
