# Evaluation Suite — Komponen NLP Churn Dashboard

Lampiran eksperimen untuk laporan/skripsi. Folder ini **terisolasi** dari
aplikasi: tidak di-import oleh `backend/app/**`, dan **aman dihapus** kapan saja
tanpa memengaruhi server, chatbot, dashboard, maupun pipeline RAG. Skrip di sini
hanya membaca komponen aplikasi **read-only** (mis. `import config`,
`from app.nlp.rag_engine import ...`) atau menjalankan model embedding/reranker
secara independen — tidak pernah menulis balik ke kode/DB produksi.

> Implementasi runtime: Fitur A (cross-encoder reranking) dan Fitur B (semantic
> caching) **sudah aktif** di `backend/app/nlp/`. Suite ini mengukurnya, bukan
> merencanakannya.

## Menjalankan

Gunakan venv yang sudah ada (`backend/venv`) — sudah berisi chromadb,
sentence-transformers, scikit-learn, scipy. Tambahan: `matplotlib` (untuk
grafik) sudah dicatat di `backend/requirements.txt`.

```powershell
# dari root project (c:\Users\anhar\Documents\Dashboard\churn-dashboard)
backend\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt   # memastikan matplotlib terpasang

# seluruh suite
backend\venv\Scripts\python.exe evaluation\run_all.py

# atau per komponen
backend\venv\Scripts\python.exe evaluation\guardrail\run_guardrail_eval.py
backend\venv\Scripts\python.exe evaluation\guardrail\run_guardrail_e2e_eval.py
backend\venv\Scripts\python.exe evaluation\reranking\run_reranking_eval.py
backend\venv\Scripts\python.exe evaluation\caching\run_caching_eval.py
backend\venv\Scripts\python.exe evaluation\rag_qa\run_toolcalling_eval.py
```

Semua output (JSON, CSV, PNG) ditulis ke `evaluation/results/`.

## Struktur

```
evaluation/
  _eval_common.py     # bootstrap path ke backend + util simpan hasil
  run_all.py          # jalankan semua langkah berurutan
  datasets/           # gold set & test set (JSON)
  guardrail/          # P/R/F1, FPR/FNR, confusion matrix
  reranking/          # Hit@k, MRR, nDCG@k, Precision@k, latensi (baseline vs rerank)
  caching/            # hit rate, entity guard, leakage, invalidation, threshold sweep
  rag_qa/             # tool-calling accuracy (butuh API key)
  results/            # output untuk laporan
```

## Komponen & metrik

| Komponen | Metrik | Butuh API LLM? | Status |
|---|---|---|---|
| Guardrail (Layer 1) | Precision, Recall, F1, FPR, FNR, confusion matrix | Tidak | Offline penuh |
| Guardrail (end-to-end) | Block rate per lapis, over-refusal | **Ya** | Skip otomatis bila tak ada key |
| Reranking | Hit@4, MRR, nDCG@4, Precision@4, latensi, Wilcoxon | Tidak (model lokal) | Jalan lokal |
| Caching | Hit rate, entity guard, cross-user leakage, invalidation, threshold sweep | Tidak | Cache di temp dir terisolasi |
| RAG-QA | Tool-calling accuracy | **Ya** (`DEEPSEEK_API_KEY`) | Skip otomatis bila tak ada key |

## Catatan metodologi (penting untuk sidang)

- **Relevansi reranking bersifat keyword-grounded** (lihat
  `datasets/reranking_gold.json`): sebuah chunk dianggap relevan bila memuat
  salah satu frasa `must_contain`. Ini reproducible tetapi **proxy** untuk
  penilaian manusia — untuk publikasi, label sebaiknya diverifikasi manual.
  Query yang tidak punya chunk relevan di pool kandidat dilaporkan sebagai
  `skipped` (tidak ikut rata-rata).
- **Caching diuji di ChromaDB temporer** (folder temp yang dihapus setelah
  selesai). Koleksi `chat_cache` produksi tidak pernah disentuh.
- **Cross-user leakage harus 0.** Bila > 0, isolasi per-`user_id` bocor.
- **Token saved:** mekanisme terverifikasi (cache hit → `tokens_used=0`). Angka
  absolut penghematan token = biaya panggilan LLM yang dihindari; ambil dari
  `tokens_used` di chat history untuk angka live.
- **Jujur soal BiLSTM/Logistic Regression:** model intent di
  `nlp_raw_model/` tidak dipanggil runtime → jangan dilaporkan sebagai metrik
  sistem produksi.

## Reproducibility

- Embedding: `paraphrase-multilingual-MiniLM-L12-v2`
- Reranker: `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`
- LLM: lihat `config.DEEPSEEK_MODEL`
- Versi model, `candidate_k`/`final_k`, threshold, dan tanggal run dicatat di
  tiap file `results/*_metrics.json`.
