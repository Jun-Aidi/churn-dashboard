# 🧭 MASTER PLANNING — Churn Dashboard

> Gabungan dari `PLANNING2.md` (optimasi performa) dan `PLANNING3.md` (RAG reranking, semantic caching, cleanup) ke dalam satu rencana terurut.
> Dokumen ini **rencana**, belum ada perubahan kode. Referensi file/baris sudah diverifikasi terhadap source (Juni 2026).
> Evaluasi kuantitatif untuk laporan/skripsi tetap di file terpisah: **`Metrik_Evaluasi.md`** (dikerjakan paling akhir).

---

## 📌 Urutan Pengerjaan Global (yang disarankan)

Prinsip: bersihkan dead code dulu → rapikan data → percepat yang paling terasa user → luruskan fondasi RAG (embedding) → baru tambah fitur RAG → terakhir evaluasi.

| Fase | Pekerjaan | Asal | Risiko | Dampak |
|---|---|---|---|---|
| 1 | Cleanup D — hapus artefak BiLSTM & Logistic Regression | PLANNING3 | Sangat rendah | Kurangi kebingungan |
| 2 | Cleanup C — hapus tabel `predictions` | PLANNING3 | Rendah | Rapikan skema |
| 3 | Performa Tier 1 — quick wins Dashboard/Pelanggan | PLANNING2 | Rendah | 🔥🔥🔥 paling terasa user |
| 4 | Performa Tier 2/3 — frontend cache, pagination, index, pool | PLANNING2 | Sedang | 🔥🔥 |
| 5 | **Migrasi Embedding → `paraphrase-multilingual-MiniLM-L12-v2`** | BARU | Sedang | Fondasi RAG (cross-lingual ID→EN) |
| 6 | Fitur A — Cross-encoder reranking (reranker multilingual) | PLANNING3 | Rendah | 🔥🔥 presisi retrieval |
| 7 | Fitur B — Semantic caching | PLANNING3 | Tinggi | 🔥 hemat token/latensi |
| 8 | **Evaluasi metrik** (file `Metrik_Evaluasi.md`) | terpisah | — | Untuk laporan |

---

## ⚠️ Catatan Lintas-Fase (titik singgung yang harus diluruskan)

1. **Invalidasi cache di `/upload` dipakai dua fitur.** Fase 3 (cache data customer) dan Fase 7 (semantic chat cache) sama-sama menambah invalidasi di fungsi `upload_csv` (`main_routes.py`). **Satukan** jadi satu helper, mis. `invalidate_user_caches(user_id)`, agar tidak ada dua pola berserakan. Implementasikan Fase 3 dulu; Fase 7 tinggal menambah satu pemanggilan.
2. **`config.py` ditambah dari beberapa fase.** Fase 5 (embedding), Fase 6 (`RERANK_*`), Fase 7 (`SEMANTIC_CACHE_*`). Tidak konflik, tapi kerjakan berurutan.
3. **Inkonsistensi embedding (WAJIB diluruskan di Fase 5).** Kondisi aktual:
   - `config.EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5'` → **string mati, tidak dipakai di mana pun**.
   - `build_vectorstore.py` docstring menyebut "nomic" tapi kodenya pakai `SentenceTransformer('all-MiniLM-L6-v2')`.
   - `rag_engine.py` hardcode `all-MiniLM-L6-v2`.
   - Vector store yang ada sekarang dibangun dengan MiniLM (384-dim) — konsisten secara teknis, tapi dokumentasinya menyesatkan.
   - **Keputusan:** pindah ke `paraphrase-multilingual-MiniLM-L12-v2` (lihat Fase 5) karena query chatbot berbahasa Indonesia sedangkan korpus paper berbahasa Inggris (cross-lingual). Sekaligus rapikan config & docstring agar satu sumber kebenaran.
4. **Reranker juga harus multilingual.** Karena bi-encoder jadi multilingual, cross-encoder di Fase 6 harus multilingual juga (lihat Fase 6), bukan `ms-marco-MiniLM-L-6-v2` (English-only).

---

# FASE 1 — Cleanup D: Hapus Artefak BiLSTM & Logistic Regression (Intent Classifier)

## Konteks
- Pipeline chatbot sekarang **LLM-driven** (DeepSeek via `llm_client.py`) dengan function calling.
- `app/nlp/intent_classifier.py` (`classify_intent`, `extract_entities`, `_keyword_fallback`) **tidak pernah dipanggil** di runtime (hanya terdefinisi). TensorFlow bahkan tidak terpasang → selalu jatuh ke `ImportError` fallback.
- **PENTING:** `scikit-learn` + `joblib` MASIH dipakai untuk model churn utama (`churn_model_bundle.pkl`) di `predict_service.py` & `customer_service.py`. **JANGAN hapus** scikit-learn/joblib. Yang dihapus hanya artefak *intent classifier chatbot*.

## D.1 Alasan
`classify_intent()` dkk tidak dipanggil di runtime; chatbot sudah LLM-driven. Ini *dead code* + artefak besar.

## D.2 Pembedaan penting (jangan salah hapus)
- **HAPUS:** intent classifier chatbot →
  - `backend/app/nlp/intent_classifier.py`
  - `backend/app/chatbot_models/deep_learning/` (intent_model.keras, intent_tokenizer.json, intent_label_map.json)
  - `backend/app/chatbot_models/logistic_regression/` (intent_model.pkl, intent_vectorizer.pkl, intent_label_map.json)
- **JANGAN HAPUS:** model churn utama (`churn_model_bundle.pkl`) + `scikit-learn` + `joblib`.

## D.3 Hal yang perlu diubah / dihapus
1. **Hapus file** `backend/app/nlp/intent_classifier.py`.
2. **Hapus folder** `backend/app/chatbot_models/` (kedua subfolder).
   - Alternatif arsip: pindahkan ke `backend/app/nlp_raw_model/` (folder riset) agar tetap ada bukti eksperimen untuk laporan.
3. **`backend/app/nlp/chat_engine.py`**
   - Perbarui docstring baris "Uses LLM (DeepSeek) as primary brain with optional BiLSTM fast-path." → hapus klausa BiLSTM.
   - Tidak ada impor `intent_classifier` di file ini (sudah dikonfirmasi).
4. **Cek impor lain** (sudah diaudit: tidak ada impor `intent_classifier`/`classify_intent` di luar file itu sendiri). Grep ulang sebelum hapus.
5. **`backend/requirements.txt`**
   - TensorFlow memang tidak terdaftar → tidak ada yang dihapus.
   - `scikit-learn`, `joblib` **tetap**.
   - `Sastrawi` — tidak dipakai di runtime mana pun. Aman dihapus dari `requirements.txt`. Pastikan notebook di `nlp_raw_model/` yang masih ingin dijalankan menginstalnya terpisah bila perlu.
6. **Dokumentasi**
   - `PLANNING.md` baris `tensorflow  # untuk BiLSTM (opsional fast-path)` → tandai usang / hapus.
   - `README.md` — bila menyebut BiLSTM sebagai bagian runtime, perbarui agar akurat (BiLSTM/logreg = artefak eksperimen, bukan pipeline produksi).

## D.4 Notebook riset (keputusan user)
Folder `backend/app/nlp_raw_model/` (`deep_learning_chatbot.ipynb`, `logistic_regresion_chatbot.ipynb`, `model_comparison.ipynb`, dataset) berisi bukti eksperimen.
- **Disarankan DIPERTAHANKAN** untuk keperluan laporan/skripsi (perbandingan model).
- Bila ingin benar-benar bersih, baru dihapus — tapi ini menghapus jejak metodologi. **Konfirmasi dulu.**

## D.5 Verifikasi
- Grep memastikan tidak ada `import` yang merujuk `intent_classifier` / `chatbot_models`.
- Jalankan server → startup tanpa error, chatbot tetap berfungsi (LLM + RAG).
- Jalankan test suite backend.

## D.6 Urutan eksekusi
grep konfirmasi → hapus `intent_classifier.py` → update docstring `chat_engine.py` → putuskan arsip vs hapus `chatbot_models/` → bersihkan requirements (cek Sastrawi) → update docs → verifikasi D.5.

---

# FASE 2 — Cleanup C: Hapus Tabel `predictions`

## Konteks
- Tabel `predictions` (model `Prediction` di `database.py`) **tidak pernah di-insert**. Satu-satunya pembaca: `auth_routes.py` (`total_predictions`) → ditampilkan di `frontend/src/pages/Admin.jsx` sebagai kartu "Total Prediksi".
- `risk_score`/`risk_class` hasil prediksi churn disimpan di tabel **`customers`**, bukan `predictions`.

## C.1 Alasan
Tabel `predictions` tidak pernah diisi; data risiko sudah ada di `customers`. Redundan.

## C.2 Hal yang HARUS diubah SEBELUM tabel dihapus (urutan wajib)
1. **Backend — `backend/app/routes/auth_routes.py`**
   - Hapus baris `total_predictions = session.query(Prediction).count()`.
   - Hapus key `"total_predictions"` dari JSON response `/api/auth/stats`.
   - Hapus `Prediction` dari import `from app.database import ...`.
   - (Opsional) Jika ingin kartu "Total Prediksi" tetap ada, ganti sumbernya: hitung jumlah customer yang sudah punya `risk_score` (`Customer.risk_score IS NOT NULL`), namai ulang mis. `total_scored_customers`.
2. **Frontend — `frontend/src/pages/Admin.jsx`**
   - Hapus `StatCard` "Total Prediksi" (`stats?.total_predictions`), atau ganti ke field baru bila opsi di atas dipilih.
3. **Test — `backend/tests/test_stats_endpoint.py`**
   - Hapus/ubah assertion `data['total_predictions'] == 3500` dan mock count terkait (sesuaikan urutan `call_count`).
4. **Spec docs (opsional, agar konsisten)** — `.kiro/specs/landing-page-login-admin/design.md` & `tasks.md`
   - Update referensi `total_predictions` dan deskripsi "predictions table".
5. **Backend — `backend/app/database.py`**
   - Hapus class `Prediction(Base)` (setelah semua referensi di atas bersih).

## C.3 Hapus tabel di MySQL
Setelah kode bersih dan diverifikasi jalan:
```sql
DROP TABLE IF EXISTS predictions;
```
- `Base.metadata.create_all` hanya membuat tabel yang masih didefinisikan; menghapus class `Prediction` mencegah tabel dibuat ulang saat startup.
- Verifikasi sekali lagi tidak ada foreign key dari tabel lain ke `predictions` sebelum drop.
- ⚠️ `DROP TABLE` bersifat destruktif & sulit dibalik. Lakukan paling akhir, setelah verifikasi C.4, dan backup DB bila perlu.

## C.4 Verifikasi
- Jalankan server → `/api/auth/stats` mengembalikan 200 tanpa `total_predictions` (atau dengan field pengganti).
- Halaman Admin render tanpa error.
- `pytest backend/tests/test_stats_endpoint.py` lulus.

## C.5 Urutan eksekusi
1 → 2 → 3 → (4 opsional) → 5 → verifikasi C.4 → C.3 (DROP TABLE).

---

# FASE 3 — Performa Tier 1: Quick Wins Dashboard & Pelanggan

## Akar masalah (berdasarkan kode aktual)

### 🔴 Service di-instansiasi ulang & query penuh per request
**Lokasi**: `backend/app/routes/main_routes.py` (`/customers`, `/customers/stats`, `/trend`). Tiap endpoint membuat `CustomerService(user_id=g.current_user.id)` baru, yang memanggil `_load_data()`:
1. Query **seluruh** baris `customers` milik user (`session.query(Customer)...all()`).
2. Membangun list-of-dict lalu `pd.DataFrame(rows)` dari nol.
3. Berpotensi menjalankan prediksi + menulis balik ke DB.

Membuka Dashboard = `useCustomers()` → `/api/customers`, `ChurnTrendChart` → `/api/trend`, `FeatureImportanceChart` → `/api/feature-importance` = **minimal 2x full-table load + 2x build DataFrame** untuk data yang sama. Halaman Pelanggan mengulang lagi. Inilah sumber "loading lama".

### 🔴 Bug prediksi di jalur GET
**Lokasi**: `customer_service.py` → `_load_data()`. `all() or any()` praktis berarti **jika ada SATU saja** `risk_score` NaN, seluruh baris diprediksi ulang + `_update_risk_in_db` menulis balik satu per satu di tengah GET. GET seharusnya tidak menulis ke DB.

### 🟠 Konversi DataFrame → dict baris per baris
`get_all_customers()` pakai `df.iterrows()` (lambat) tanpa cache.

### ✅ Yang sudah benar (jangan diutak-atik)
- Model bundle di-load **sekali** di level modul (`customer_service.py`). Sudah optimal.
- Tidak ada lagi fallback CSV di runtime.

## 3.1 Hentikan instansiasi & query berulang dalam satu request  — 🔥🔥🔥
**Pendekatan A (paling cepat): cache per-user dengan TTL pendek.** Buat `backend/app/services/customer_cache.py`:
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
Di `CustomerService._load_data()`: cek cache dulu; kalau tidak ada → query + simpan. **Invalidasi** cache user di `add_customer()` dan di `/api/upload` setelah insert.
> 🔗 Lihat Catatan Lintas-Fase #1: invalidasi `/upload` ini nantinya akan disatukan dengan invalidasi semantic cache (Fase 7) lewat satu helper `invalidate_user_caches(user_id)`.

**Pendekatan B (opsional, lebih bersih): satu service per request via Flask `g`** (`g._customer_service`).

## 3.2 Keluarkan prediksi dari jalur GET — 🔥🔥🔥
- Prediksi risk_score **hanya** saat data masuk: `add_customer()` (sudah) dan `/api/upload` (sudah, lihat `upload_csv` memanggil `_predict_dataframe`).
- Di `_load_data()`, hapus prediksi + `_update_risk_in_db` dari GET. Bila tetap mau jaring pengaman untuk baris NaN, prediksi **hanya baris NaN** tanpa tulis balik saat GET:
```python
needs_pred = self.df['risk_score'].isna()
if needs_pred.any():
    predicted = _predict_dataframe(self.df[needs_pred].copy())
    self.df.loc[needs_pred, 'risk_score'] = predicted['risk_score'].values
    self.df.loc[needs_pred, 'risk_class'] = predicted['risk_class'].values
    # TODO: jadwalkan update DB di luar request (atau saat upload), bukan di sini
```

## 3.3 Aktifkan kompresi gzip — 🔥🔥
`pip install flask-compress` (tambahkan ke `requirements.txt`). Di `backend/app/__init__.py`:
```python
from flask_compress import Compress

def create_app():
    app = Flask(__name__)
    CORS(app)
    Compress(app)
    app.config['COMPRESS_MIMETYPES'] = ['application/json', 'text/html', 'text/css', 'application/javascript']
    app.config['COMPRESS_LEVEL'] = 6
    app.config['COMPRESS_MIN_SIZE'] = 500
    ...
```

## 3.4 Percepat konversi baris → dict — 🔥🔥
Ganti `df.iterrows()` dengan `df.to_dict('records')` lalu map per dict, atau vektorisasi kolom turunan (`tenure_months`, `monthly_revenue`) dengan operasi pandas sebelum konversi.

## Verifikasi Fase 3
- **Network tab**: `/customers` & `/trend` tidak lagi memicu dua full-load DB.
- **Log backend**: timing sederhana di `_load_data()` untuk konfirmasi query DB berkurang.
- **gzip**: response header `Content-Encoding: gzip` muncul untuk `/api/customers`.
- **TTFB** `/api/customers` turun signifikan setelah cache + hapus prediksi dari GET.

---

# FASE 4 — Performa Tier 2/3: Frontend Cache, Pagination, Index, Pool

## 4.1 Pagination + filter di backend — 🔥🔥 (besar) / 🔥 (kecil)
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
> Counts per kategori (high/med/low) untuk tab harus dihitung dari total (via `/customers/stats`), bukan halaman aktif, agar tab `Customers.jsx` akurat.

## 4.2 Frontend: cache & hindari fetch ulang antar-navigasi — 🔥🔥
- **Ringan (tanpa dependency)**: angkat data customer ke context/provider, fetch sekali, dipakai Dashboard & Pelanggan.
- **Standar industri**: `@tanstack/react-query` (`npm install @tanstack/react-query`), bungkus `QueryClientProvider`, ubah `useCustomers`/`useTrend` jadi `useQuery` dengan `staleTime` ~5 menit + `refetchOnWindowFocus: false`.
- Jika backend sudah pagination (4.1), `useCustomers(page, perPage, riskFilter)` kirim param ke `fetchCustomers`.

## 4.3 Tambah index DB untuk pola query umum — 🔥
Di model `Customer` (`database.py`):
```python
__table_args__ = (
    UniqueConstraint('user_id', 'customer_id', name='uq_user_customer'),
    Index('idx_user_risk', 'user_id', 'risk_class'),
)
```
(Filter utama selalu `user_id`, jadi index gabungan `user_id, risk_class` paling relevan.)

## 4.4 Lazy-load komponen chart — 🔥
Di `Dashboard.jsx`:
```javascript
import { lazy, Suspense } from 'react';
const ChurnTrendChart = lazy(() => import('../components/charts/ChurnTrendChart'));
const FeatureImportanceChart = lazy(() => import('../components/charts/FeatureImportanceChart'));
// bungkus render-nya dengan <Suspense fallback={...}>
```

## 4.5 (Tier 3) `pool_pre_ping` & tuning pool
Di `init_db()`:
```python
engine = create_engine(config.SQLALCHEMY_DATABASE_URI,
    pool_size=10, max_overflow=20, pool_recycle=1800,
    pool_pre_ping=True, echo=False)
```
`pool_pre_ping=True` murah & menghindari error koneksi basi ("lag di request pertama").

## 4.6 (Tier 3) Virtual scrolling — hanya jika perlu
`Customers.jsx` sudah `.slice(0, 100)`. `react-window` baru perlu kalau ingin render jauh lebih banyak tanpa pagination. Umumnya **belum perlu**.

## Catatan konsistensi data
- Cache TTL pendek (≈60 dtk) + invalidasi eksplisit saat `add_customer`/upload menjaga data fresh.
- Pastikan counts tab di `Customers.jsx` dihitung dari total (via `/stats`), bukan satu halaman.

---

# FASE 5 — Migrasi Embedding ke `paraphrase-multilingual-MiniLM-L12-v2` (BARU)

## 5.1 Alasan
Query chatbot berbahasa **Indonesia**, sedangkan korpus paper (`data/papers/*.pdf`) berbahasa **Inggris** → skenario **cross-lingual retrieval**. `all-MiniLM-L6-v2` English-only sehingga query Indonesia di-embed ke ruang yang tidak selaras dengan dokumen Inggris (retrieval lemah). `paraphrase-multilingual-MiniLM-L12-v2` melatih kalimat bermakna sama lintas bahasa agar berdekatan di ruang vektor → query Indonesia bisa menemukan chunk paper Inggris yang relevan.

Sekaligus migrasi ini **meluruskan inkonsistensi embedding** (Catatan Lintas-Fase #3): config menyebut nomic (mati), build & runtime pakai MiniLM. Setelah fase ini, satu sumber kebenaran.

## 5.2 Perbandingan singkat
| Aspek | all-MiniLM-L6-v2 (lama) | paraphrase-multilingual-MiniLM-L12-v2 (baru) |
|---|---|---|
| Bahasa | English-only | 50+ bahasa, termasuk Indonesia |
| Cross-lingual ID→EN | Lemah | Kuat |
| Dimensi | 384 | 384 (sama) |
| Max token | 256 | 128 (lebih pendek → perhatikan chunk size) |
| Ukuran/params | ~80MB / ~22M | ~470MB / ~118M |
| Kecepatan CPU | Sangat cepat | ~3–4x lebih lambat |

## 5.3 Perubahan kode
1. **`backend/config.py`**
   - Ganti `EMBEDDING_MODEL = 'nomic-ai/nomic-embed-text-v1.5'` → `EMBEDDING_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'`.
   - Jadikan **satu sumber kebenaran** — file lain harus baca dari sini, bukan hardcode.
2. **`backend/build_vectorstore.py`**
   - Ganti `SentenceTransformer('all-MiniLM-L6-v2')` → `SentenceTransformer(config.EMBEDDING_MODEL)`.
   - Perbaiki docstring (jangan lagi menyebut "nomic"/"all-MiniLM").
   - **Turunkan `chunk_size`** dari 800 → ~400–500 karakter, `chunk_overlap` ~80, karena max token model 128 (chunk 800 char akan terpotong agresif).
3. **`backend/app/nlp/rag_engine.py`**
   - Ganti `SentenceTransformer('all-MiniLM-L6-v2')` di `init_rag()` → `SentenceTransformer(config.EMBEDDING_MODEL)`.
4. **Rebuild vector store (wajib)**
   - Embedding lama (MiniLM 384) ≠ baru (multilingual 384) walau dimensi sama — nilai vektor beda total. Store lama **harus** dibangun ulang:
     ```
     python build_vectorstore.py
     ```
   - Script sudah otomatis menghapus `chroma_db/` lama sebelum membangun ulang.

## 5.4 Dependency
- Tidak ada paket baru (`sentence-transformers` sudah ada). Model diunduh otomatis saat pertama jalan (~470MB).

## 5.5 Risiko & mitigasi
- **Truncation 128 token** → mitigasi: kecilkan `chunk_size` (poin 5.3.2).
- **Lebih lambat di CPU** → masih wajar untuk skala ini; relevan juga untuk Fase 7 (semantic cache sering meng-embed query).
- **Reuse di Fase 7**: `cache_lookup/cache_store` akan memakai `_embed_model` yang sama (multilingual). Konsisten.

## 5.6 Verifikasi
- `python build_vectorstore.py` selesai tanpa error, jumlah chunk tercetak.
- Chatbot menjawab pertanyaan konseptual berbahasa Indonesia dengan konteks paper yang relevan (uji manual beberapa query).
- Catat nama model untuk reproducibility laporan (lihat `Metrik_Evaluasi.md`).

---

# FASE 6 — Fitur A: Cross-Encoder Reranking (RAG)

## A.1 Tujuan
Pola **retrieve-then-rerank**: bi-encoder (multilingual MiniLM) ambil banyak kandidat → cross-encoder saring yang paling relevan, sehingga konteks yang dikirim ke LLM lebih presisi.

## A.2 Desain
- Tahap 1 (retrieve): `search_papers` ambil `CANDIDATE_K` (mis. 20) kandidat dari ChromaDB.
- Tahap 2 (rerank): cross-encoder skor tiap pasangan `(query, chunk)`; ambil `FINAL_K` (mis. 4) teratas.
- **Model reranker: gunakan cross-encoder MULTILINGUAL** — `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` (mendukung query Indonesia → dokumen Inggris). ⚠️ **Jangan** pakai `cross-encoder/ms-marco-MiniLM-L-6-v2` (English-only); kalau bi-encoder sudah multilingual tapi reranker English-only, gain cross-lingual hilang di tahap rerank.
- Reranker di-load sekali di `init_rag()` (lazy, mirip `_embed_model`).
- Jika reranker gagal dimuat → fallback otomatis ke hasil bi-encoder murni (graceful degradation).

## A.3 Perubahan kode
- `backend/app/nlp/rag_engine.py`
  - Tambah global `_reranker` + load di `init_rag()` dari `config.RERANK_MODEL`.
  - Tambah konstanta/baca config `CANDIDATE_K = 20`, `FINAL_K = 4`.
  - Modifikasi `search_papers(query, k)`: retrieve `CANDIDATE_K` → skor ulang `_reranker.predict([(query, c['content']), ...])` → urutkan desc → kembalikan `k` teratas; sertakan `rerank_score` (opsional, untuk logging/evaluasi).
  - `is_available()` tetap berbasis bi-encoder (reranker opsional).
- `backend/app/nlp/llm_client.py`
  - Tidak wajib berubah; `search_papers` tetap dipanggil `k=4`. Opsional turunkan jumlah chunk final bila kualitas cukup (hemat token).

## A.4 Dependency
- Tidak ada paket baru (`sentence-transformers>=2.2`). Unduhan model reranker (~150MB untuk varian L12 multilingual) saat pertama jalan.

## A.5 Konfigurasi (`config.py`)
- `RERANK_ENABLED` (default `True`)
- `RERANK_MODEL` (default `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`)
- `RERANK_CANDIDATE_K` (default `20`)

## A.6 Pengujian
- Unit test: `search_papers` mengembalikan ≤ `FINAL_K`, urutan sesuai skor reranker.
- Test fallback: reranker `None` → hasil tetap valid (bi-encoder).
- Evaluasi riset (Hit@k, MRR, nDCG sebelum vs sesudah) → lihat `Metrik_Evaluasi.md`.

## A.7 Risiko
- Latensi naik (+50–300ms di CPU untuk ~20 chunk). Mitigasi: kecilkan `RERANK_CANDIDATE_K`.
- Memori +~120–200MB.

---

# FASE 7 — Fitur B: Semantic Caching

## B.1 Tujuan
Hindari panggilan LLM berulang untuk pertanyaan yang **maknanya** mirip → hemat token & turunkan latensi.

## B.2 Lingkup AMAN (wajib dipatuhi)
- **Scope per `user_id`** — cache tidak boleh dibagi antar user (kebenaran & keamanan).
- **Hanya cache pertanyaan konseptual/teoretis** (jawaban berbasis paper/RAG yang stabil), mis. "apa itu churn", "strategi retensi umum".
- **JANGAN cache** pertanyaan bergantung data live atau mengandung entitas spesifik (mis. `C-xxxx`, "berapa total high-risk").
- **Invalidasi** cache user saat upload dataset baru.
- **TTL** sebagai lapis pengaman tambahan (mis. 1 jam).

## B.3 Desain
- Collection ChromaDB kedua: `chat_cache`.
- Di `process_chat`:
  1. Tentukan apakah pertanyaan *cacheable* (heuristik: tidak mengandung pola entitas `c-\d+`, bukan agregat data live).
  2. Embed pertanyaan (pakai `_embed_model` multilingual yang sama dari Fase 5).
  3. Query `chat_cache` dengan filter `user_id` (+ TTL).
  4. Jika `similarity ≥ CACHE_THRESHOLD` (mis. 0.92) → kembalikan jawaban tersimpan; `source='cache'`, `tokens_used=0`.
  5. Jika miss → jalankan LLM → simpan `(embedding, jawaban, user_id, created_at)`.

## B.4 Perubahan kode
- `backend/app/nlp/rag_engine.py` (atau modul baru `cache_engine.py`): `cache_lookup(query, user_id)`, `cache_store(query, answer, user_id)`, reuse `_embed_model`.
- `backend/app/nlp/chat_engine.py`: di `process_chat` cek cache sebelum LLM, simpan setelah LLM (hanya bila cacheable); tambah heuristik `_is_cacheable(text)`.
- `backend/app/routes/main_routes.py`: di `/upload` panggil invalidasi cache user.
  > 🔗 Catatan Lintas-Fase #1: **satukan** dengan invalidasi customer cache Fase 3 → satu helper `invalidate_user_caches(user_id)` yang memanggil `customer_data_cache.invalidate(user_id)` + `cache_invalidate(user_id)`.
- `backend/app/database.py` (opsional): tabel `chat_cache` bila ingin TTL/audit berbasis SQL (disarankan cukup ChromaDB + metadata `created_at`).

## B.5 Konfigurasi (`config.py`)
- `SEMANTIC_CACHE_ENABLED` (default `True`)
- `CACHE_THRESHOLD` (default `0.92`)
- `CACHE_TTL_SECONDS` (default `3600`)

## B.6 Pengujian
- Dua parafrase pertanyaan konseptual → call kedua = hit (`tokens_used == 0`).
- Scoping: user A tidak pernah menerima jawaban cache user B.
- Invalidasi: setelah upload, lookup user tsb = miss.
- Guard: pertanyaan dengan `C-0001` tidak pernah masuk/keluar cache.
- Metrik riset (hit rate, token tersimpan, penurunan latensi) → lihat `Metrik_Evaluasi.md`.

## B.7 Risiko
- Jawaban basi / kebocoran antar-user bila scoping/invalidasi salah → ditangani aturan B.2.
- False positive similarity → threshold konservatif + exclude entitas.

---

# ✅ Checklist Verifikasi Akhir (semua fase)
- [ ] Server start tanpa error.
- [ ] (Fase 2) `/api/auth/stats` 200 & Admin page render benar; tidak ada referensi `Prediction`.
- [ ] (Fase 1) Tidak ada referensi tersisa ke `intent_classifier`, `chatbot_models` di kode runtime.
- [ ] (Fase 3/4) Dashboard & Pelanggan tidak lagi memicu full-load DB berulang; gzip aktif.
- [ ] (Fase 5) Vector store dibangun ulang dengan `paraphrase-multilingual-MiniLM-L12-v2`; config = runtime (satu sumber kebenaran).
- [ ] (Fase 6) Chatbot menjawab (LLM + RAG + reranking multilingual); fallback aman bila reranker gagal.
- [ ] (Fase 7) Cache hit hanya untuk pertanyaan konseptual, scoped per user, ter-invalidasi saat upload; invalidasi `/upload` disatukan.
- [ ] Test suite backend lulus.

---

# 📊 Evaluasi (Fase 8) — di `Metrik_Evaluasi.md`
Evaluasi kuantitatif (reranking, semantic caching, guardrail, RAG QA) dikerjakan **paling akhir** dan didokumentasikan di **`Metrik_Evaluasi.md`**. Semua skrip/notebook evaluasi dibuat di **folder eksperimen terpisah** yang tidak memengaruhi runtime aplikasi (lihat catatan folder di `Metrik_Evaluasi.md`).
