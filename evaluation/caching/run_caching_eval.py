"""
Semantic Caching evaluation (Metrik_Evaluasi.md §2).

Exercises the REAL cache_engine functions (is_cacheable / cache_lookup /
cache_store / cache_invalidate) but redirects the ChromaDB path to a TEMP
directory so the production 'chat_cache' collection is never touched. The
shared embedding model is loaded read-only from the real vector store via
rag_engine.init_rag().

Measures:
  * Entity-guard accuracy (is_cacheable on conceptual vs live-data queries)
  * Cache hit rate on paraphrase pairs (semantic hits)
  * False-positive hits on unrelated pairs
  * Cross-user leakage (must be 0)
  * Invalidation correctness
  * Hit-rate vs CACHE_THRESHOLD sweep
  * Cache-hit lookup latency (ms)

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\caching\\run_caching_eval.py
"""

import os
import sys
import time
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

import config

USER_A = 1001
USER_B = 2002


def _setup_isolated_cache():
    """Load embedding model from the real store (read-only), then point the
    cache engine at a throwaway temp ChromaDB so we never write to production."""
    # Skip reranker load — not needed here, saves time.
    config.RERANK_ENABLED = False
    from app.nlp import rag_engine
    if not rag_engine.init_rag():
        raise RuntimeError("RAG init failed — embedding model unavailable.")

    tmp = tempfile.mkdtemp(prefix="eval_cache_")
    real_dir = config.CHROMA_PERSIST_DIR
    config.CHROMA_PERSIST_DIR = tmp          # redirect cache to temp
    config.SEMANTIC_CACHE_ENABLED = True
    from app.nlp import cache_engine
    if not cache_engine.init_cache():
        config.CHROMA_PERSIST_DIR = real_dir
        shutil.rmtree(tmp, ignore_errors=True)
        raise RuntimeError("Cache init failed.")
    config.CHROMA_PERSIST_DIR = real_dir     # restore (collection handle already bound to temp)
    return cache_engine, tmp


def eval_entity_guard(cache_engine, data):
    rows, correct = [], 0
    tp = fp = tn = fn = 0  # positive class = cacheable=True
    for item in data["cacheable_labels"]:
        pred = cache_engine.is_cacheable(item["text"])
        exp = bool(item["cacheable"])
        ok = pred == exp
        correct += ok
        if exp and pred: tp += 1
        elif exp and not pred: fn += 1
        elif not exp and pred: fp += 1
        else: tn += 1
        rows.append({"text": item["text"], "expected_cacheable": exp, "predicted_cacheable": pred, "correct": ok})
    n = len(rows)
    acc = correct / n if n else 0.0
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    return {"accuracy": round(acc, 4), "precision_cacheable": round(prec, 4),
            "recall_cacheable": round(rec, 4),
            "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn}}, rows


def eval_hit_rate(cache_engine, pairs, user=USER_A, threshold=None):
    """Per-pair: invalidate, store a, lookup b. Returns hits + similarities + latency."""
    if threshold is not None:
        config.CACHE_THRESHOLD = threshold
    hits, sims, lats = 0, [], []
    detail = []
    for p in pairs:
        cache_engine.cache_invalidate(user)
        cache_engine.cache_store(p["a"], f"[jawaban konseptual untuk: {p['a']}]", user)
        t0 = time.perf_counter()
        res = cache_engine.cache_lookup(p["b"], user)
        lats.append((time.perf_counter() - t0) * 1000.0)
        hit = res is not None
        hits += hit
        sim = res["similarity"] if res else None
        if sim is not None:
            sims.append(sim)
        detail.append({"a": p["a"], "b": p["b"], "hit": hit, "similarity": round(sim, 4) if sim else None})
    cache_engine.cache_invalidate(user)
    return {
        "n_pairs": len(pairs),
        "hits": hits,
        "hit_rate": round(hits / len(pairs), 4) if pairs else 0.0,
        "avg_similarity_on_hit": round(sum(sims) / len(sims), 4) if sims else None,
        "avg_lookup_ms": round(sum(lats) / len(lats), 3) if lats else None,
    }, detail


def eval_false_positive(cache_engine, pairs, user=USER_A):
    false_hits = 0
    detail = []
    for p in pairs:
        cache_engine.cache_invalidate(user)
        cache_engine.cache_store(p["a"], f"[jawaban: {p['a']}]", user)
        res = cache_engine.cache_lookup(p["b"], user)
        fh = res is not None
        false_hits += fh
        detail.append({"a": p["a"], "b": p["b"], "false_hit": fh,
                       "similarity": round(res["similarity"], 4) if res else None})
    cache_engine.cache_invalidate(user)
    return {"n_pairs": len(pairs), "false_hits": false_hits,
            "false_positive_rate": round(false_hits / len(pairs), 4) if pairs else 0.0}, detail


def eval_cross_user_leakage(cache_engine, pairs):
    leaks = 0
    for p in pairs:
        cache_engine.cache_invalidate(USER_A)
        cache_engine.cache_invalidate(USER_B)
        cache_engine.cache_store(p["a"], "[jawaban user A]", USER_A)
        # user B asks the EXACT same question -> must be a miss
        res = cache_engine.cache_lookup(p["a"], USER_B)
        if res is not None:
            leaks += 1
    cache_engine.cache_invalidate(USER_A)
    cache_engine.cache_invalidate(USER_B)
    return {"n_tested": len(pairs), "leaks": leaks, "leakage_rate": round(leaks / len(pairs), 4) if pairs else 0.0}


def eval_invalidation(cache_engine, pairs, user=USER_A):
    sample = pairs[0]
    cache_engine.cache_invalidate(user)
    cache_engine.cache_store(sample["a"], "[jawaban]", user)
    before = cache_engine.cache_lookup(sample["a"], user) is not None
    cache_engine.cache_invalidate(user)
    after = cache_engine.cache_lookup(sample["a"], user) is not None
    return {"hit_before_invalidate": before, "hit_after_invalidate": after,
            "invalidation_works": bool(before and not after)}


def eval_threshold_sweep(cache_engine, para, unrel):
    thresholds = [0.70, 0.75, 0.80, 0.83, 0.85, 0.88, 0.90, 0.92, 0.94, 0.95]
    orig = config.CACHE_THRESHOLD
    rows = []
    for t in thresholds:
        hr, _ = eval_hit_rate(cache_engine, para, threshold=t)
        config.CACHE_THRESHOLD = t
        fp, _ = eval_false_positive(cache_engine, unrel)
        rows.append({"threshold": t, "hit_rate": hr["hit_rate"],
                     "false_positive_rate": fp["false_positive_rate"]})
    config.CACHE_THRESHOLD = orig
    return rows


def main():
    ec.print_header("SEMANTIC CACHING EVALUATION")
    print(f"Run at: {ec.now_stamp()}")
    print(f"Embedding model : {config.EMBEDDING_MODEL}")
    print(f"CACHE_THRESHOLD : {config.CACHE_THRESHOLD}  TTL={config.CACHE_TTL_SECONDS}s\n")

    data = ec.load_dataset("caching_pairs.json")
    para = data["paraphrase_pairs"]
    unrel = data["unrelated_pairs"]

    cache_engine, tmp = _setup_isolated_cache()
    try:
        guard, guard_rows = eval_entity_guard(cache_engine, data)
        hit, hit_detail = eval_hit_rate(cache_engine, para)
        fp, fp_detail = eval_false_positive(cache_engine, unrel)
        leak = eval_cross_user_leakage(cache_engine, para)
        inval = eval_invalidation(cache_engine, para)
        sweep = eval_threshold_sweep(cache_engine, para, unrel)
    finally:
        config.CHROMA_PERSIST_DIR = tmp
        try:
            cache_engine.cache_invalidate(None)
        except Exception:
            pass
        shutil.rmtree(tmp, ignore_errors=True)

    print("Entity guard (is_cacheable):")
    print(f"  accuracy={guard['accuracy']}  precision={guard['precision_cacheable']}  recall={guard['recall_cacheable']}  {guard['confusion']}\n")
    print("Paraphrase hit rate:")
    print(f"  hit_rate={hit['hit_rate']}  ({hit['hits']}/{hit['n_pairs']})  avg_sim_on_hit={hit['avg_similarity_on_hit']}  avg_lookup_ms={hit['avg_lookup_ms']}\n")
    print("Unrelated false-positive hits:")
    print(f"  false_positive_rate={fp['false_positive_rate']}  ({fp['false_hits']}/{fp['n_pairs']})\n")
    print("Cross-user leakage (MUST be 0):")
    print(f"  leakage_rate={leak['leakage_rate']}  leaks={leak['leaks']}/{leak['n_tested']}\n")
    print("Invalidation:")
    print(f"  works={inval['invalidation_works']} (before={inval['hit_before_invalidate']}, after={inval['hit_after_invalidate']})\n")
    print("Threshold sweep (hit_rate / false_positive_rate):")
    for r in sweep:
        print(f"  thr={r['threshold']:<5} hit_rate={r['hit_rate']:<6} fp_rate={r['false_positive_rate']}")
    print()

    note_tokens = ("Mechanism verified: a cache hit returns tokens_used=0, "
                   "saving an entire LLM generation (initial + tool-call rounds). "
                   "Absolute token savings = the token cost of the avoided LLM call "
                   "(measure live via tokens_used in chat history for exact figures).")

    out = {
        "run_at": ec.now_stamp(),
        "embedding_model": config.EMBEDDING_MODEL,
        "cache_threshold": config.CACHE_THRESHOLD,
        "cache_ttl_seconds": config.CACHE_TTL_SECONDS,
        "entity_guard": guard,
        "paraphrase_hit_rate": hit,
        "unrelated_false_positive": fp,
        "cross_user_leakage": leak,
        "invalidation": inval,
        "threshold_sweep": sweep,
        "token_saving_note": note_tokens,
    }
    ec.save_json("caching_metrics.json", out)
    ec.save_json("caching_hit_detail.json", {"paraphrase": hit_detail, "unrelated": fp_detail})
    ec.save_json("caching_entity_guard_detail.json", guard_rows)
    ec.save_csv("caching_threshold_sweep.csv", sweep,
                fieldnames=["threshold", "hit_rate", "false_positive_rate"])
    _plot_sweep(sweep)
    print(f"Results written to: {ec.RESULTS_DIR}")


def _plot_sweep(sweep):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        thr = [r["threshold"] for r in sweep]
        hr = [r["hit_rate"] for r in sweep]
        fpr = [r["false_positive_rate"] for r in sweep]
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.plot(thr, hr, "o-", label="Hit rate (paraphrase)")
        ax.plot(thr, fpr, "s--", label="False-positive rate (unrelated)")
        ax.set_xlabel("CACHE_THRESHOLD")
        ax.set_ylabel("Rate")
        ax.set_ylim(-0.05, 1.05)
        ax.set_title("Semantic cache: hit rate vs threshold")
        ax.legend()
        ax.grid(alpha=0.3)
        fig.tight_layout()
        fig.savefig(ec.results_path("caching_threshold_sweep.png"), dpi=150)
        plt.close(fig)
        print("Saved figure: results/caching_threshold_sweep.png")
    except Exception as e:
        print(f"[skip plot] {e}")


if __name__ == "__main__":
    main()
