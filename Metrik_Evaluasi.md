# Metrik Evaluasi — Komponen NLP Churn Dashboard

Dokumen ini merencanakan evaluasi kuantitatif untuk komponen NLP yang **benar-benar berjalan** di sistem, serta dua fitur baru pada `PLANNING3.md` (Reranking RAG & Semantic Caching). Tujuannya menyediakan angka yang valid dan dapat dipertahankan untuk laporan/skripsi.

> Catatan ruang lingkup: Dokumen ini adalah **rencana evaluasi**, bukan perubahan kode aplikasi. Skrip/notebook evaluasi nantinya dibuat **terpisah** dari kode runtime agar tidak mengubah perilaku sistem.

---

## 📁 ATURAN FOLDER EKSPERIMEN (WAJIB)

Seluruh pekerjaan evaluasi pada dokumen ini **harus** berada di satu folder khusus yang **terisolasi** dari aplikasi:

- **Lokasi disarankan:** `evaluation/` di root project (mis. `churn-dashboard/evaluation/`), terpisah dari `backend/app/` runtime.
- **Sifat folder ini:**
  - **Tidak boleh** di-import oleh kode runtime (`backend/app/**`). Aplikasi harus tetap jalan normal **tanpa** folder ini.
  - **Aman dihapus kapan saja** — menghapus `evaluation/` tidak boleh menyebabkan error atau perubahan perilaku pada server, chatbot, dashboard, maupun pipeline RAG.
  - Hanya berisi **skrip/notebook eksperimen, dataset uji (gold set), dan hasil evaluasi** (tabel, grafik, CSV/JSON output) untuk laporan/skripsi.
- **Boleh** membaca komponen aplikasi secara read-only (mis. `from app.nlp.rag_engine import search_papers`) atau menjalankan model embedding/reranker secara independen, **tapi tidak menulis balik** ke kode/DB produksi.
- Tambahkan `evaluation/` ke `.gitignore` bila tidak ingin output eksperimen ikut ter-commit (opsional).
- Struktur contoh:
  ```
  evaluation/
    datasets/        # gold set query+relevansi, set parafrase, set serangan injeksi
    reranking/       # skrip Hit@k, MRR, nDCG (baseline vs treatment)
    caching/         # skrip hit rate, token saved, latency
    guardrail/       # skrip precision/recall/F1 deteksi injeksi
    rag_qa/          # RAGAS / LLM-as-judge
    results/         # output tabel & grafik untuk laporan
    README.md        # cara menjalankan + catatan reproducibility
  ```

> Intinya: folder evaluasi = **lampiran eksperimen**, bukan bagian sistem. Dihapus pun project tetap utuh.

---

## Konteks Penting (hasil audit kode)

- Pipeline NLP yang aktif: **LLM DeepSeek (function calling) + RAG (ChromaDB + embedding) + guardrail regex**.
- **Model embedding RAG:** sesuai `master_planning.md` Fase 5, embedding dimigrasikan ke **`paraphrase-multilingual-MiniLM-L12-v2`** (cross-lingual: query Indonesia → paper Inggris). Catatan: vector store lama dibangun dengan `all-MiniLM-L6-v2`; pastikan evaluasi memakai store yang sudah di-rebuild dengan model baru, dan **catat model mana yang dipakai** di tiap eksperimen.
- `intent_classifier.py` (BiLSTM) dan `chatbot_models/logistic_regression` **tidak dipanggil di runtime** (dead code, lihat `PLANNING3.md` Cleanup D). TensorFlow bahkan tidak terpasang.
- Karena itu, **akurasi ~100% BiLSTM dari notebook TIDAK boleh dilaporkan sebagai metrik sistem produksi**. Bila ingin ditampilkan, posisikan jujur sebagai "eksperimen pembanding arsitektur intent classifier" di bab terpisah — angka 100% pada dataset sintetis 55.000 sampel justru indikasi data terlalu mudah/bocor, bukan keunggulan model.

---

## Prioritas Evaluasi (urut dari paling kuat untuk laporan)

| Prioritas | Komponen | Jenis Evaluasi | Status di Sistem |
|---|---|---|---|
| 1 | Cross-Encoder Reranking (Fitur A) | Information Retrieval (baseline vs treatment) | Rencana PLANNING3 |
| 2 | Semantic Caching (Fitur B) | Efisiensi (hit rate, token, latensi) | Rencana PLANNING3 |
| 3 | Guardrail / Prompt Injection | Klasifikasi biner | **Aktif** |
| 4 | Pipeline LLM end-to-end (RAG QA) | Kualitas jawaban (RAGAS / LLM-as-judge) | **Aktif** |

---

## 1. Cross-Encoder Reranking (Fitur A) — Prioritas Utama

### 1.1 Tujuan
Mengukur peningkatan presisi retrieval dari pola **retrieve-then-rerank** (bi-encoder multilingual MiniLM → cross-encoder), dengan desain eksperimen **baseline vs treatment**.

### 1.2 Metrik
- **Hit@k / Recall@k** — apakah chunk relevan masuk top-k.
- **MRR (Mean Reciprocal Rank)** — posisi chunk relevan pertama.
- **nDCG@k** — kualitas urutan ranking (memperhitungkan posisi).
- **Precision@k** — proporsi chunk relevan di top-k.
- **Latensi** (ms) — biaya tambahan reranking (untuk analisis trade-off).

### 1.3 Data yang dibutuhkan
- **Gold set**: 30–50 query uji tentang churn + daftar chunk/dokumen yang ditandai relevan secara manual (ground truth). Ini bagian kerja paling menyita waktu namun wajib.
- Sumber chunk: vector store `churn_papers` yang sudah ada di ChromaDB.

### 1.4 Desain tabel hasil (untuk laporan)

| Konfigurasi | Hit@4 | MRR | nDCG@4 | Precision@4 | Latensi (ms) |
|---|---|---|---|---|---|
| Bi-encoder (baseline) | | | | | |
| Bi-encoder + Reranker | | | | | |

### 1.5 Prosedur
1. Untuk tiap query: retrieve `CANDIDATE_K` (mis. 20) kandidat dari bi-encoder.
2. Hitung metrik baseline pada top-k bi-encoder.
3. Rerank kandidat dengan cross-encoder, ambil top-k, hitung metrik treatment.
4. Bandingkan rata-rata semua query + uji signifikansi sederhana (mis. paired t-test / Wilcoxon).

---

## 2. Semantic Caching (Fitur B)

### 2.1 Tujuan
Mengukur penghematan biaya/latensi dari caching jawaban pertanyaan yang maknanya mirip, sekaligus memverifikasi keamanan (isolasi antar-user).

### 2.2 Metrik
- **Cache Hit Rate** (%) — proporsi pertanyaan terlayani dari cache.
- **Token Saved** — rata-rata token dihemat per hit (data `tokens_used` sudah tersedia di pipeline).
- **Latency Reduction** (ms / %) — selisih waktu respons cache hit vs LLM call.
- **Cache Precision** — proporsi cache hit yang jawabannya benar untuk pertanyaan baru (uji manual sampel).
- **Cross-user Leakage** — harus **0**: user A tidak boleh menerima jawaban cache user B.

### 2.3 Data yang dibutuhkan
- Set pertanyaan konseptual + parafrasenya (mis. "apa itu churn" vs "jelaskan pengertian churn").
- Set pertanyaan berbasis data live (mengandung `C-xxxx`, agregat) untuk memastikan **tidak** masuk cache.

### 2.4 Skenario uji
- Dua parafrase pertanyaan konseptual → panggilan kedua = hit (`tokens_used == 0`).
- Pertanyaan dengan entitas `C-0001` → tidak pernah masuk/keluar cache.
- Setelah upload dataset baru → cache user ter-invalidasi (lookup = miss).
- Grafik **Hit Rate vs `CACHE_THRESHOLD`** (mis. 0.85–0.95) untuk menunjukkan trade-off penghematan vs risiko false positive.

---

## 3. Guardrail / Prompt Injection (Aktif)

### 3.1 Tujuan
Mengevaluasi efektivitas filter injeksi (`_is_prompt_injection`) dan validasi output (`_validate_output`) sebagai klasifikasi biner (blok vs lolos).

### 3.2 Metrik
- **Precision, Recall, F1** deteksi injeksi.
- **False Positive Rate (FPR)** — pertanyaan sah yang salah diblokir.
- **False Negative Rate (FNR)** — serangan injeksi yang lolos.
- **Confusion matrix** (blok/lolos × injeksi/sah).

### 3.3 Data yang dibutuhkan
- Dataset uji berlabel: campuran pertanyaan normal seputar churn + variasi serangan prompt injection (bahasa Indonesia & Inggris).
- Saran ukuran: ~100–200 sampel seimbang.

---

## 4. Pipeline LLM End-to-End (RAG QA, Aktif)

### 4.1 Tujuan
Menilai kualitas jawaban akhir LLM yang menggunakan tool + RAG. Bersifat generatif, sehingga **metrik klasifikasi klasik tidak cocok langsung**.

### 4.2 Metrik
- **Faithfulness / Groundedness** — jawaban konsisten dengan data tool/chunk, tidak halusinasi.
- **Answer Relevance** — jawaban menjawab pertanyaan inti.
- **Context Precision / Recall** — kualitas konteks yang diambil RAG.
- **Tool-calling Accuracy** — apakah LLM memanggil fungsi yang benar (mis. `get_customer_profile` saat ditanya `C-0001`). Ini terukur seperti klasifikasi → bisa pakai **accuracy/F1** (angka ramah laporan).

### 4.3 Metode
- **RAGAS** atau **DeepEval** untuk faithfulness, answer relevance, context precision/recall.
- **LLM-as-a-judge** untuk penilaian kualitas berskala (1–5) bila tanpa jawaban acuan.
- Tool-calling accuracy: siapkan set pertanyaan + tool yang seharusnya dipanggil, bandingkan dengan tool yang benar-benar dipanggil.

### 4.4 Metrik operasional pelengkap
- **Token usage** rata-rata per jawaban (sudah dilog di `tokens_used`).
- **Latency** dan **error/success rate**.

---

## Ringkasan Kebutuhan Data per Komponen

| Komponen | Dataset yang disiapkan | Effort |
|---|---|---|
| Reranking | Gold set query + chunk relevan | Tinggi |
| Semantic Caching | Pasangan parafrase + pertanyaan data-live | Sedang |
| Guardrail | Pertanyaan normal + serangan injeksi berlabel | Rendah–Sedang |
| LLM RAG QA | Set pertanyaan (+ jawaban acuan opsional) | Sedang–Tinggi |

---

## Catatan Metodologi (penting untuk sidang/laporan)

1. **Pisahkan eksperimen dari produksi.** Semua skrip evaluasi berdiri sendiri; tidak mengubah `app/nlp/*` runtime.
2. **Jujur soal BiLSTM/Logistic Regression.** Tempatkan sebagai studi pembanding arsitektur, bukan metrik sistem berjalan.
3. **Hindari klaim akurasi 100%** tanpa konteks — jelaskan keterbatasan dataset sintetis.
4. **Sertakan baseline.** Untuk reranking dan caching, selalu bandingkan terhadap kondisi tanpa fitur.
5. **Reproducibility.** Catat versi model (embedding `paraphrase-multilingual-MiniLM-L12-v2`, reranker `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`, model DeepSeek), seed, dan tanggal pengambilan data. Bila membandingkan embedding lama vs baru (`all-MiniLM-L6-v2` vs multilingual), catat keduanya secara eksplisit.
6. **Folder terisolasi.** Semua skrip evaluasi berada di `evaluation/` (lihat aturan di awal dokumen) — aman dihapus tanpa memengaruhi aplikasi.

---

## Urutan Pengerjaan yang Disarankan

1. **Guardrail** (paling cepat menghasilkan angka, dataset kecil).
2. **Reranking** (kontribusi inti, butuh gold set — mulai siapkan lebih awal).
3. **Semantic Caching** (setelah fitur B diimplementasi).
4. **LLM RAG QA / RAGAS** (pelengkap kualitas, paling subjektif).
