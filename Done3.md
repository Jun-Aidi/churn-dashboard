# PLANNING3 — RAG Reranking, Semantic Caching, Cleanup Tabel `predictions` & Penghapusan BiLSTM/Logistic Regression

Dokumen ini merencanakan empat pekerjaan terpisah namun saling melengkapi:

1. **Fitur A — Cross-Encoder Reranking** pada pipeline RAG.
2. **Fitur B — Semantic Caching** untuk jawaban berbasis paper/konseptual.
3. **Cleanup C — Menghapus tabel `predictions`** yang tidak pernah diisi.
4. **Cleanup D — Menghapus seluruh artefak BiLSTM & Logistic Regression** (intent classifier chatbot) yang tidak terpakai.

> Catatan ruang lingkup: Dokumen ini adalah rencana, belum ada perubahan kode.
> Urutan eksekusi yang disarankan: **D → C → A → B** (membersihkan dulu yang mati, baru menambah fitur).

---

## Konteks Temuan Awal (hasil audit kode)

- Pipeline chatbot saat ini **LLM-driven** (DeepSeek via `llm_client.py`) dengan function calling.
- `app/nlp/intent_classifier.py` (`classify_intent`, `extract_entities`, `_keyword_fallback`) **tidak pernah dipanggil** di runtime aplikasi (hanya terdefinisi).
- TensorFlow **tidak ada** di `backend/requirements.txt`, sehingga `intent_classifier.py` selalu jatuh ke `ImportError` fallback saat ini.
- Tabel `predictions` (model `Prediction` di `database.py`) **tidak pernah di-insert**. Satu-satunya pembaca: `auth_routes.py` (`total_predictions`) → ditampilkan di `frontend/src/pages/Admin.jsx` sebagai kartu "Total Prediksi".
- `risk_score`/`risk_class` hasil prediksi churn disimpan di tabel **`customers`**, bukan `predictions`.
- **PENTING:** `scikit-learn` + `joblib` MASIH dipakai untuk model churn utama (`churn_model_bundle.pkl`) di `predict_service.py` & `customer_service.py`. **JANGAN hapus** scikit-learn/joblib. Yang dihapus hanya artefak *intent classifier chatbot* (folder `logistic_regression` & `deep_learning` di `chatbot_models/`).
- Komponen NLP/DL yang benar-benar aktif: embedding `all-MiniLM-L6-v2` (RAG) + LLM DeepSeek + guardrail regex.

---

# FITUR A — Cross-Encoder Reranking (RAG)

## A.1 Tujuan
Meningkatkan presisi konteks yang dikirim ke LLM dengan pola **retrieve-then-rerank**:
bi-encoder (MiniLM) mengambil banyak kandidat → cross-encoder menyaring yang paling relevan.

## A.2 Desain
- Tahap 1 (retrieve): `search_papers` mengambil kandidat lebih banyak (`CANDIDATE_K`, mis. 20) dari ChromaDB.
- Tahap 2 (rerank): cross-encoder memberi skor tiap pasangan `(query, chunk)`; ambil `FINAL_K` (mis. 4) teratas.
- Model reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2` (dari paket `sentence-transformers` yang sudah ada).
- Reranker di-load sekali di `init_rag()` (lazy, mirip `_embed_model`).
- Jika reranker gagal dimuat → fallback otomatis ke hasil bi-encoder murni (graceful degradation).

## A.3 Perubahan kode
- `backend/app/nlp/rag_engine.py`
  - Tambah global `_reranker` + load di `init_rag()`.
  - Tambah konstanta `CANDIDATE_K = 20`, `FINAL_K = 4`.
  - Modifikasi `search_papers(query, k)`:
    - retrieve `CANDIDATE_K` kandidat,
    - skor ulang via `_reranker.predict([(query, c['content']), ...])`,
    - urutkan desc, kembalikan `k` teratas,
    - sertakan `rerank_score` di tiap chunk (opsional, untuk logging/evaluasi).
  - `is_available()` tetap berbasis bi-encoder (reranker opsional).
- `backend/app/nlp/llm_client.py`
  - Tidak wajib berubah; `search_papers` tetap dipanggil dengan `k=4`.
  - Opsional: turunkan jumlah chunk final bila kualitas sudah cukup (hemat token).

## A.4 Dependency
- Tidak ada paket baru (sudah tercakup `sentence-transformers>=2.2`).
- Tambahan unduhan model reranker (~80MB) saat pertama jalan.

## A.5 Konfigurasi
- Tambah opsi di `config.py` (opsional, dengan default):
  - `RERANK_ENABLED` (default `True`)
  - `RERANK_MODEL` (default `cross-encoder/ms-marco-MiniLM-L-6-v2`)
  - `RERANK_CANDIDATE_K` (default `20`)

## A.6 Pengujian & Evaluasi
- Unit test: `search_papers` mengembalikan ≤ `FINAL_K`, urutan sesuai skor reranker.
- Test fallback: reranker `None` → hasil tetap valid (bi-encoder).
- Evaluasi riset (untuk laporan): siapkan set pertanyaan uji + chunk relevan, ukur **Hit@k, MRR, nDCG** sebelum vs sesudah reranking.

## A.7 Risiko
- Latensi naik (+50–300ms di CPU untuk ~20 chunk). Mitigasi: `RERANK_CANDIDATE_K` dapat dikecilkan.
- Memori +~80–120MB.

---

# FITUR B — Semantic Caching

## B.1 Tujuan
Menghindari panggilan LLM berulang untuk pertanyaan yang **maknanya** mirip, sehingga hemat token & menurunkan latensi.

## B.2 Lingkup AMAN (wajib dipatuhi)
Karena data per-user dan dinamis:
- **Scope per `user_id`** — cache tidak boleh dibagi antar user (isu kebenaran & keamanan).
- **Hanya cache pertanyaan konseptual/teoretis** (jawaban berbasis paper/RAG yang stabil), mis. "apa itu churn", "strategi retensi umum".
- **JANGAN cache** pertanyaan yang bergantung data live atau mengandung entitas spesifik (mis. customer ID `C-xxxx`, "berapa total high-risk").
- **Invalidasi** cache milik user saat dia melakukan upload dataset baru (paling rapi).
- **TTL** sebagai lapis pengaman tambahan (mis. 1 jam).

## B.3 Desain
- Collection ChromaDB kedua: `chat_cache`.
- Saat pesan masuk (di `process_chat`):
  1. Tentukan apakah pertanyaan *cacheable* (heuristik: tidak mengandung pola entitas `c-\d+`, bukan pertanyaan agregat data live). 
  2. Embed pertanyaan (pakai `_embed_model` MiniLM).
  3. Query `chat_cache` dengan filter `user_id` (+ TTL).
  4. Jika `similarity ≥ CACHE_THRESHOLD` (mis. 0.92) → kembalikan jawaban tersimpan; `source='cache'`, `tokens_used=0`.
  5. Jika miss → jalankan LLM → simpan `(embedding, jawaban, user_id, created_at)` ke `chat_cache`.

## B.4 Perubahan kode
- `backend/app/nlp/rag_engine.py` (atau modul baru `cache_engine.py`)
  - Fungsi `cache_lookup(query, user_id)` dan `cache_store(query, answer, user_id)`.
  - Reuse `_embed_model`.
- `backend/app/nlp/chat_engine.py`
  - Di `process_chat`: cek cache sebelum LLM, simpan setelah LLM (hanya bila cacheable).
  - Tambah heuristik `_is_cacheable(text)`.
- `backend/app/routes/main_routes.py`
  - Di endpoint `/upload`: panggil invalidasi cache milik user (`cache_invalidate(user_id)`).
- `backend/app/database.py` (opsional)
  - Jika ingin TTL/audit berbasis SQL, tambah tabel `chat_cache`. (Disarankan cukup di ChromaDB + metadata `created_at`.)

## B.5 Konfigurasi (`config.py`)
- `SEMANTIC_CACHE_ENABLED` (default `True`)
- `CACHE_THRESHOLD` (default `0.92`)
- `CACHE_TTL_SECONDS` (default `3600`)

## B.6 Pengujian & Evaluasi
- Test: dua parafrase pertanyaan konseptual → call kedua = cache hit (`tokens_used == 0`).
- Test scoping: user A tidak pernah menerima jawaban cache user B.
- Test invalidasi: setelah upload, lookup user tsb = miss.
- Test guard: pertanyaan dengan `C-0001` tidak pernah masuk/keluar cache.
- Metrik riset: **cache hit rate**, **rata-rata token tersimpan**, **penurunan latensi**.

## B.7 Risiko
- Jawaban basi / kebocoran antar-user bila scoping/invalidasi salah → ditangani aturan B.2.
- False positive similarity → set threshold konservatif + exclude entitas.

---

# CLEANUP C — Hapus Tabel `predictions`

## C.1 Alasan
Tabel `predictions` tidak pernah diisi; data risiko sudah ada di tabel `customers`. Redundan.

## C.2 Hal yang HARUS diubah SEBELUM tabel dihapus
Urutan wajib agar endpoint stats tidak crash:

1. **Backend — `backend/app/routes/auth_routes.py`**
   - Hapus baris `total_predictions = session.query(Prediction).count()`.
   - Hapus key `"total_predictions"` dari JSON response `/api/auth/stats`.
   - Hapus `Prediction` dari import `from app.database import ...`.
   - (Opsional) Jika ingin kartu "Total Prediksi" tetap ada, ganti sumbernya: hitung jumlah customer yang sudah punya `risk_score` (`Customer.risk_score IS NOT NULL`) dan ganti namanya jadi mis. `total_scored_customers`.

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
- Karena `Base.metadata.create_all` hanya membuat tabel yang masih didefinisikan, menghapus class `Prediction` mencegah tabel dibuat ulang saat startup.
- Tidak ada foreign key dari tabel lain ke `predictions` (perlu diverifikasi sekali lagi sebelum drop).

## C.4 Verifikasi
- Jalankan server → `/api/auth/stats` mengembalikan 200 tanpa `total_predictions` (atau dengan field pengganti).
- Halaman Admin render tanpa error.
- `pytest backend/tests/test_stats_endpoint.py` lulus.

## C.5 Urutan eksekusi C
1 → 2 → 3 → (4 opsional) → 5 → verifikasi C.4 → C.3 (DROP TABLE).

---

# CLEANUP D — Hapus Artefak BiLSTM & Logistic Regression (Intent Classifier Chatbot)

## D.1 Alasan
`classify_intent()` & kawan-kawan tidak dipanggil di runtime; chatbot sudah LLM-driven.
TensorFlow bahkan tidak terpasang. Ini *dead code* + artefak besar.

## D.2 PEMBEDAAN PENTING (jangan salah hapus)
- **HAPUS:** intent classifier chatbot →
  - `backend/app/nlp/intent_classifier.py`
  - `backend/app/chatbot_models/deep_learning/` (intent_model.keras, intent_tokenizer.json, intent_label_map.json)
  - `backend/app/chatbot_models/logistic_regression/` (intent_model.pkl, intent_vectorizer.pkl, intent_label_map.json)
- **JANGAN HAPUS:** model churn utama (`churn_model_bundle.pkl`) + `scikit-learn` + `joblib` — masih dipakai `predict_service.py` & `customer_service.py`.

## D.3 Hal yang perlu diubah / dihapus
1. **Hapus file** `backend/app/nlp/intent_classifier.py`.
2. **Hapus folder** `backend/app/chatbot_models/` (kedua subfolder) — bila tidak ingin menyimpan artefak sama sekali.
   - Alternatif arsip: pindahkan ke `backend/app/nlp_raw_model/` (folder riset) alih-alih hapus permanen, agar tetap ada bukti eksperimen untuk laporan.
3. **`backend/app/nlp/chat_engine.py`**
   - Perbarui docstring baris "Uses LLM (DeepSeek) as primary brain with optional BiLSTM fast-path." → hapus klausa BiLSTM.
   - Tidak ada impor `intent_classifier` di file ini (sudah dikonfirmasi), jadi tidak ada impor yang perlu dicabut.
4. **Cek impor lain** (sudah diaudit: tidak ada импор `intent_classifier`/`classify_intent` di luar file itu sendiri). Lakukan grep ulang sebelum hapus untuk memastikan.
5. **`backend/requirements.txt`**
   - TensorFlow memang tidak terdaftar → tidak ada yang dihapus di sini.
   - `scikit-learn`, `joblib` **tetap** (model churn).
   - `Sastrawi` — sudah diaudit: **tidak dipakai di kode runtime mana pun** (hanya tercantum di requirements, kemungkinan sisa pemakaian notebook intent). Aman dihapus dari `requirements.txt`. Pastikan notebook di `nlp_raw_model/` yang masih ingin dijalankan menginstalnya terpisah bila perlu.
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

## D.6 Urutan eksekusi D
grep konfirmasi → hapus `intent_classifier.py` → update docstring `chat_engine.py` → putuskan arsip vs hapus `chatbot_models/` → bersihkan requirements (cek Sastrawi) → update docs → verifikasi D.5.

---

# Ringkasan Urutan Global yang Disarankan

1. **D** — buang dead code intent classifier (paling aman, mengurangi kebingungan).
2. **C** — hapus tabel `predictions` (setelah membereskan stats endpoint + Admin.jsx + test).
3. **A** — tambah cross-encoder reranking (peningkatan terukur, risiko rendah).
4. **B** — tambah semantic caching (paling berisiko, terapkan paling akhir dengan guard ketat).

# Checklist Verifikasi Akhir
- [ ] Server start tanpa error.
- [ ] `/api/auth/stats` 200 & Admin page render benar.
- [ ] Chatbot menjawab (LLM + RAG + reranking).
- [ ] Cache hit hanya untuk pertanyaan konseptual, scoped per user, ter-invalidasi saat upload.
- [ ] Tidak ada referensi tersisa ke `Prediction`, `intent_classifier`, `chatbot_models` di kode runtime.
- [ ] Test suite backend lulus.
