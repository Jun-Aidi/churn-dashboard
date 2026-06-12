"""
Diagnostik: kenapa semantic cache tidak hit di runtime?

Mereplikasi PERSIS urutan startup aplikasi pada path ChromaDB ASLI:
    init_rag() -> init_cache()
lalu menguji store + lookup untuk pertanyaan identik dengan user uji
(ID 999999), dan membersihkannya kembali (cache_invalidate) agar cache
produksi tidak meninggalkan jejak.

Tujuan: memastikan apakah _cache_collection berhasil dibuat dan apakah
lookup untuk pertanyaan yang SAMA menghasilkan hit (similarity ~1.0).

Jalankan:
    backend\\venv\\Scripts\\python.exe evaluation\\caching\\diagnose_runtime_cache.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

import config

TEST_USER = 999999
Q = "Apa kelebihan random forest untuk prediksi churn?"


def main():
    ec.print_header("DIAGNOSTIK RUNTIME SEMANTIC CACHE")
    print(f"CHROMA_PERSIST_DIR : {config.CHROMA_PERSIST_DIR}")
    print(f"SEMANTIC_CACHE_ENABLED : {getattr(config, 'SEMANTIC_CACHE_ENABLED', None)}")
    print(f"CACHE_THRESHOLD : {getattr(config, 'CACHE_THRESHOLD', None)}\n")

    from app.nlp import rag_engine, cache_engine

    print("[1] init_rag() ...")
    rag_ok = rag_engine.init_rag()
    print(f"    init_rag -> {rag_ok}, embed_model loaded = {rag_engine.get_embed_model() is not None}")

    print("[2] init_cache() ...")
    cache_ok = cache_engine.init_cache()
    print(f"    init_cache -> {cache_ok}, cache.is_available = {cache_engine.is_available()}\n")

    if not cache_engine.is_available():
        print(">>> TEMUAN: _cache_collection GAGAL dibuat. Cache tidak akan pernah hit.")
        print(">>> Lihat pesan [CACHE WARNING] di atas untuk penyebabnya.")
        return

    print(f"[3] is_cacheable({Q!r}) = {cache_engine.is_cacheable(Q)}")

    # bersihkan dulu user uji
    cache_engine.cache_invalidate(TEST_USER)

    print("[4] cache_store(...) untuk pertanyaan uji ...")
    cache_engine.cache_store(Q, "[jawaban dummy untuk diagnostik]", TEST_USER)

    print("[5] cache_lookup(pertanyaan IDENTIK) ...")
    res_same = cache_engine.cache_lookup(Q, TEST_USER)
    print(f"    -> {res_same}")

    print("[6] cache_lookup(parafrasa dekat) ...")
    res_para = cache_engine.cache_lookup(
        "Mengapa random forest bagus untuk prediksi churn?", TEST_USER)
    print(f"    -> {res_para}")

    # bersihkan jejak user uji dari cache produksi
    cache_engine.cache_invalidate(TEST_USER)
    print("\n[cleanup] entri user uji 999999 dihapus dari cache.")

    print("\n--- KESIMPULAN ---")
    if res_same is not None:
        print("Cache BERFUNGSI: pertanyaan identik menghasilkan hit "
              f"(similarity={res_same.get('similarity')}).")
        print("Kalau di server tetap tidak hit, periksa: (a) apakah user_id login "
              "sama, (b) log startup '[CACHE] Semantic cache ready', "
              "(c) apakah jawaban pertama tersimpan (source bukan blocked/fallback).")
    else:
        print("Pertanyaan identik pun MISS — store atau lookup bermasalah di "
              "lingkungan ini. Lihat pesan [CACHE] error di atas (jika ada).")


if __name__ == "__main__":
    main()
