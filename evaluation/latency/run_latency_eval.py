"""
Chatbot latency evaluation — breakdown "lambatnya di mana".

Menjalankan pipeline chatbot YANG SAMA seperti yang dipakai user (process_chat
-> chat_with_llm -> tool-calling -> RAG/rerank -> cache) memakai user_id ADMIN
nyata, lalu mengukur waktu per tahap untuk tiap pertanyaan.

Fidelitas vs isolasi:
  * user_id admin nyata + data customer asli di MySQL  -> tool membaca data
    yang persis dilihat user saat login.
  * RAG + reranker diinit sesuai config produksi (RERANK_ENABLED apa adanya)
    supaya biaya rerank ikut terukur.
  * Semantic cache diarahkan ke ChromaDB temp -> koleksi chat_cache PRODUKSI
    tidak tersentuh.
  * chat_history yang ditulis pakai session_id ber-prefix 'eval_lat_' lalu
    DIHAPUS lagi di akhir -> tidak mengotori history produksi.

Instrumentasi: membungkus (monkeypatch read-only, hanya untuk proses ini)
  - LLM call  (_client.chat.completions.create)  -> jumlah call + ms + token
  - rag_engine.search_papers                      -> ms retrieval+rerank
  - reranker.predict                               -> ms rerank saja (best-effort)
  - cache_engine.cache_lookup / cache_store        -> ms (embed + chroma)
  - chat_engine._save_chat_history                 -> ms tulis DB

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\latency\\run_latency_eval.py
"""

import os
import sys
import time
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

import config

EVAL_SESSION_PREFIX = "eval_lat_"

# ── Span collector (single-threaded; process_chat dijalankan berurutan) ──
_SPANS = []


def _record(stage, ms, **meta):
    entry = {"stage": stage, "ms": ms}
    entry.update(meta)
    _SPANS.append(entry)


def _reset_spans():
    _SPANS.clear()


# ══════════════════════════════════════════════════════════════════════════════
# SETUP
# ══════════════════════════════════════════════════════════════════════════════

def _find_admin_user_id():
    """Ambil user_id admin dari DB (role='admin', fallback ADMIN_EMAIL)."""
    from app.database import get_session, close_session
    from app.models.user import User

    session = get_session()
    if session is None:
        raise RuntimeError("MySQL tidak tersedia — init_db gagal.")
    try:
        admin = session.query(User).filter_by(role="admin").order_by(User.id).first()
        if admin is None:
            admin_email = os.getenv("ADMIN_EMAIL")
            if admin_email:
                admin = session.query(User).filter_by(email=admin_email).first()
        if admin is None:
            raise RuntimeError("User admin tidak ditemukan di tabel users.")
        return admin.id, admin.email
    finally:
        close_session(session)


def _count_customers(user_id):
    from app.database import get_session, close_session, Customer
    session = get_session()
    if session is None:
        return 0
    try:
        return session.query(Customer).filter_by(user_id=user_id).count()
    finally:
        close_session(session)


def _pick_customer_id(user_id):
    """Ambil satu customer_id nyata milik admin untuk query profil."""
    from app.database import get_session, close_session, Customer
    session = get_session()
    if session is None:
        return None
    try:
        row = session.query(Customer.customer_id).filter_by(user_id=user_id).first()
        return row[0] if row else None
    finally:
        close_session(session)


def _setup():
    """Init DB, RAG (real + reranker), cache (temp dir), LLM. Pasang instrumentasi."""
    from app.database import init_db
    if not init_db():
        raise RuntimeError("init_db() gagal — pastikan MySQL berjalan & terisi.")

    # RAG real (memuat embedding model + reranker sesuai config produksi).
    from app.nlp import rag_engine
    if not rag_engine.init_rag():
        raise RuntimeError("RAG init gagal — vector store / embedding model tak tersedia.")

    # Cache -> temp dir (jangan sentuh chat_cache produksi).
    tmp = tempfile.mkdtemp(prefix="eval_latency_cache_")
    real_dir = config.CHROMA_PERSIST_DIR
    config.CHROMA_PERSIST_DIR = tmp
    config.SEMANTIC_CACHE_ENABLED = True
    from app.nlp import cache_engine
    if not cache_engine.init_cache():
        config.CHROMA_PERSIST_DIR = real_dir
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("Cache init gagal.")
    config.CHROMA_PERSIST_DIR = real_dir  # handle koleksi sudah terikat ke temp

    # LLM real.
    from app.nlp import llm_client
    if not llm_client.init_llm():
        config.CHROMA_PERSIST_DIR = tmp
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("LLM init gagal — set DEEPSEEK_API_KEY di backend/.env.")

    _install_instrumentation(rag_engine, cache_engine, llm_client)
    return tmp


# ── Proxy tipis untuk menghitung waktu tiap LLM call (tahan thd internal SDK) ──
class _TimedCompletions:
    def __init__(self, real):
        self._real = real

    def create(self, *a, **k):
        t0 = time.perf_counter()
        resp = self._real.create(*a, **k)
        dt = (time.perf_counter() - t0) * 1000.0
        tokens = 0
        try:
            tokens = resp.usage.total_tokens if resp.usage else 0
        except Exception:
            pass
        _record("llm_call", dt, tokens=tokens)
        return resp


class _TimedChat:
    def __init__(self, real):
        self._real = real

    @property
    def completions(self):
        return _TimedCompletions(self._real.completions)


class _TimedClient:
    def __init__(self, real):
        self._real = real

    @property
    def chat(self):
        return _TimedChat(self._real.chat)

    def __getattr__(self, name):
        return getattr(self._real, name)


def _install_instrumentation(rag_engine, cache_engine, llm_client):
    # LLM client proxy
    llm_client._client = _TimedClient(llm_client._client)

    # rag_engine.search_papers (dipanggil lewat import di llm_client._execute_tool)
    _orig_search = rag_engine.search_papers

    def timed_search(query, k=4):
        t0 = time.perf_counter()
        out = _orig_search(query, k=k)
        _record("rag_search", (time.perf_counter() - t0) * 1000.0, n_chunks=len(out))
        return out

    rag_engine.search_papers = timed_search

    # reranker.predict (best-effort, hanya jika reranker termuat)
    if getattr(rag_engine, "_reranker", None) is not None:
        _orig_predict = rag_engine._reranker.predict

        def timed_predict(pairs, *a, **k):
            t0 = time.perf_counter()
            out = _orig_predict(pairs, *a, **k)
            _record("rerank_predict", (time.perf_counter() - t0) * 1000.0, n_pairs=len(pairs))
            return out

        rag_engine._reranker.predict = timed_predict

    # cache lookup / store
    _orig_lookup = cache_engine.cache_lookup

    def timed_lookup(query, user_id):
        t0 = time.perf_counter()
        out = _orig_lookup(query, user_id)
        _record("cache_lookup", (time.perf_counter() - t0) * 1000.0, hit=out is not None)
        return out

    cache_engine.cache_lookup = timed_lookup

    _orig_store = cache_engine.cache_store

    def timed_store(query, answer, user_id):
        t0 = time.perf_counter()
        out = _orig_store(query, answer, user_id)
        _record("cache_store", (time.perf_counter() - t0) * 1000.0)
        return out

    cache_engine.cache_store = timed_store

    # save history (chat_engine memanggilnya by-name di modulnya sendiri)
    from app.nlp import chat_engine
    _orig_save = chat_engine._save_chat_history

    def timed_save(session_id, user_message, result, user_id=None):
        t0 = time.perf_counter()
        out = _orig_save(session_id, user_message, result, user_id)
        _record("save_history", (time.perf_counter() - t0) * 1000.0)
        return out

    chat_engine._save_chat_history = timed_save


def _cleanup(tmp, user_id):
    """Hapus chat_history eval + temp cache dir."""
    try:
        from app.database import get_session, close_session, ChatHistory
        session = get_session()
        if session:
            session.query(ChatHistory).filter(
                ChatHistory.session_id.like(f"{EVAL_SESSION_PREFIX}%")
            ).delete(synchronize_session=False)
            session.commit()
            close_session(session)
    except Exception as e:
        print(f"[cleanup] gagal hapus chat_history eval: {e}")
    shutil.rmtree(tmp, ignore_errors=True)


# ══════════════════════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════════════════════

def _summarize_spans():
    """Ringkas _SPANS untuk satu query jadi metrik per tahap."""
    llm = [s for s in _SPANS if s["stage"] == "llm_call"]
    rag = [s for s in _SPANS if s["stage"] == "rag_search"]
    rer = [s for s in _SPANS if s["stage"] == "rerank_predict"]
    look = [s for s in _SPANS if s["stage"] == "cache_lookup"]
    store = [s for s in _SPANS if s["stage"] == "cache_store"]
    save = [s for s in _SPANS if s["stage"] == "save_history"]
    return {
        "n_llm_calls": len(llm),
        "llm_ms": round(sum(s["ms"] for s in llm), 1),
        "llm_tokens": sum(s.get("tokens", 0) for s in llm),
        "rag_search_ms": round(sum(s["ms"] for s in rag), 1),
        "rerank_ms": round(sum(s["ms"] for s in rer), 1),
        "cache_lookup_ms": round(sum(s["ms"] for s in look), 1),
        "cache_lookup_hit": any(s.get("hit") for s in look),
        "cache_store_ms": round(sum(s["ms"] for s in store), 1),
        "save_history_ms": round(sum(s["ms"] for s in save), 1),
    }


def run_query(query_text, user_id):
    import uuid
    from app.nlp.chat_engine import process_chat

    session_id = f"{EVAL_SESSION_PREFIX}{uuid.uuid4().hex[:8]}"
    _reset_spans()
    t0 = time.perf_counter()
    result = process_chat(query_text, session_id, user_id=user_id)
    total_ms = (time.perf_counter() - t0) * 1000.0

    row = {"query": query_text, "total_ms": round(total_ms, 1),
           "source": result.get("source", "?"),
           "tokens_used": result.get("tokens_used", 0),
           "response_chars": len(result.get("response", ""))}
    row.update(_summarize_spans())
    # "other" = total - tahap terukur (overhead python, parsing tool args, DB read service)
    measured = (row["llm_ms"] + row["cache_lookup_ms"] +
                row["cache_store_ms"] + row["save_history_ms"])
    # rag/rerank sudah termasuk di dalam llm_ms? TIDAK — rag dipanggil di antara
    # dua llm call (saat eksekusi tool), terpisah dari waktu generate LLM.
    measured += row["rag_search_ms"]
    row["other_ms"] = round(max(0.0, total_ms - measured), 1)
    return row


def main():
    ec.print_header("CHATBOT LATENCY EVALUATION")
    print(f"Run at: {ec.now_stamp()}")

    tmp = _setup()
    try:
        admin_id, admin_email = _find_admin_user_id()
        n_cust = _count_customers(admin_id)
        print(f"Admin user_id  : {admin_id} ({admin_email})")
        print(f"Customer rows  : {n_cust}")
        print(f"LLM model      : {config.DEEPSEEK_MODEL}")
        print(f"Rerank enabled : {config.RERANK_ENABLED}  (candidate_k={config.RERANK_CANDIDATE_K})")
        print(f"Embedding model: {config.EMBEDDING_MODEL}\n")
        if n_cust == 0:
            print("[WARNING] Admin belum punya data customer — jawaban tool tidak representatif.\n")

        sample_cid = _pick_customer_id(admin_id) or "C-0001"

        data = ec.load_dataset("latency_queries.json")
        rows = []
        for i, q in enumerate(data["queries"], 1):
            text = q["text"].replace("{CUSTOMER_ID}", str(sample_cid))
            print(f"[{i}/{len(data['queries'])}] ({q['category']}) {text}")
            row = run_query(text, admin_id)
            row["category"] = q["category"]
            rows.append(row)
            print(f"      total={row['total_ms']}ms | llm={row['llm_ms']}ms"
                  f" ({row['n_llm_calls']} call) | rag={row['rag_search_ms']}ms"
                  f" (rerank={row['rerank_ms']}ms) | cache_lookup={row['cache_lookup_ms']}ms"
                  f" | source={row['source']}\n")
    finally:
        try:
            _cleanup(tmp, None)
        except Exception:
            shutil.rmtree(tmp, ignore_errors=True)

    _report(rows)


def _avg(rows, key):
    vals = [r[key] for r in rows if isinstance(r.get(key), (int, float))]
    return round(sum(vals) / len(vals), 1) if vals else 0.0


def _report(rows):
    n = len(rows)
    stages = ["llm_ms", "rag_search_ms", "cache_lookup_ms",
              "cache_store_ms", "save_history_ms", "other_ms"]
    avg_total = _avg(rows, "total_ms")
    avg_stage = {s: _avg(rows, s) for s in stages}

    print("=" * 70)
    print("RINGKASAN LATENSI (rata-rata semua query)")
    print("=" * 70)
    print(f"Total rata-rata : {avg_total} ms\n")
    print(f"{'Tahap':<18}{'rata-rata (ms)':>16}{'% total':>12}")
    print("-" * 46)
    label = {"llm_ms": "LLM call", "rag_search_ms": "RAG search",
             "cache_lookup_ms": "Cache lookup", "cache_store_ms": "Cache store",
             "save_history_ms": "Save history", "other_ms": "Lainnya"}
    for s in stages:
        pct = (avg_stage[s] / avg_total * 100) if avg_total else 0
        print(f"{label[s]:<18}{avg_stage[s]:>16}{pct:>11.1f}%")
    print(f"\n(catatan: RAG search rata-rata termasuk rerank "
          f"{_avg(rows, 'rerank_ms')} ms; rata-rata {_avg(rows, 'n_llm_calls')} LLM call/query)\n")

    # Per kategori
    print("Per kategori (total ms rata-rata):")
    cats = {}
    for r in rows:
        cats.setdefault(r["category"], []).append(r)
    for c, rs in cats.items():
        print(f"  {c:<14}: {round(sum(x['total_ms'] for x in rs)/len(rs),1)} ms"
              f"  (llm {round(sum(x['llm_ms'] for x in rs)/len(rs),1)} ms)")
    print()

    out = {
        "run_at": ec.now_stamp(),
        "llm_model": config.DEEPSEEK_MODEL,
        "rerank_enabled": config.RERANK_ENABLED,
        "rerank_candidate_k": config.RERANK_CANDIDATE_K,
        "embedding_model": config.EMBEDDING_MODEL,
        "n_queries": n,
        "avg_total_ms": avg_total,
        "avg_stage_ms": avg_stage,
        "avg_rerank_ms": _avg(rows, "rerank_ms"),
        "avg_n_llm_calls": _avg(rows, "n_llm_calls"),
        "dominant_stage": max(avg_stage, key=avg_stage.get) if avg_stage else None,
    }
    ec.save_json("latency_metrics.json", out)
    fieldnames = ["category", "query", "total_ms", "source", "n_llm_calls",
                  "llm_ms", "llm_tokens", "tokens_used", "rag_search_ms", "rerank_ms",
                  "cache_lookup_ms", "cache_lookup_hit", "cache_store_ms",
                  "save_history_ms", "other_ms", "response_chars"]
    ec.save_csv("latency_per_query.csv",
                [{k: r.get(k) for k in fieldnames} for r in rows], fieldnames)
    _plot(avg_stage, label)
    print(f"Results written to: {ec.RESULTS_DIR}")


def _plot(avg_stage, label):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        stages = list(avg_stage.keys())
        vals = [avg_stage[s] for s in stages]
        names = [label[s] for s in stages]
        colors = ["#e03d3d", "#d4a017", "#2da44e", "#1f6feb", "#8957e5", "#6e7781"]

        fig, ax = plt.subplots(figsize=(8, 4.5))
        bars = ax.bar(names, vals, color=colors[:len(stages)])
        ax.set_ylabel("Rata-rata waktu (ms)")
        ax.set_title("Breakdown latensi chatbot per tahap")
        ax.grid(axis="y", alpha=0.3)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.0f}",
                    ha="center", va="bottom", fontsize=9)
        plt.xticks(rotation=20, ha="right")
        fig.tight_layout()
        fig.savefig(ec.results_path("latency_breakdown.png"), dpi=150)
        plt.close(fig)
        print("Saved figure: results/latency_breakdown.png")
    except Exception as e:
        print(f"[skip plot] {e}")


if __name__ == "__main__":
    main()
