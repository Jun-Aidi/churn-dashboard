"""
Cross-Encoder Reranking evaluation (Metrik_Evaluasi.md §1).

Design: baseline (bi-encoder order) vs treatment (bi-encoder -> cross-encoder
rerank). Independent harness — loads the SAME models named in config
(EMBEDDING_MODEL + RERANK_MODEL) and reads the 'churn_papers' ChromaDB
collection READ-ONLY. It does not import private runtime globals and does not
write anything back to the app.

Metrics @k (default k=4): Hit@k, MRR, nDCG@k, Precision@k, plus retrieval and
rerank latency. A paired Wilcoxon test compares per-query nDCG (treatment vs
baseline).

Relevance: keyword-grounded (see datasets/reranking_gold.json) — a PROXY for
human judgments; spot-check before publishing.

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\reranking\\run_reranking_eval.py
"""

import os
import sys
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

import config


def is_relevant(text: str, must_contain, mode="any") -> int:
    t = (text or "").lower()
    hits = [kw for kw in must_contain if kw.lower() in t]
    if mode == "all":
        return int(len(hits) == len(must_contain))
    return int(len(hits) > 0)


def hit_at_k(rels, k):
    return 1.0 if any(rels[:k]) else 0.0


def precision_at_k(rels, k):
    topk = rels[:k]
    return sum(topk) / k if k else 0.0


def mrr(rels):
    for i, r in enumerate(rels, start=1):
        if r:
            return 1.0 / i
    return 0.0


def ndcg_at_k(rels, k):
    dcg = 0.0
    for i, r in enumerate(rels[:k], start=1):
        dcg += r / math.log2(i + 1)
    ideal = sorted(rels, reverse=True)[:k]
    idcg = sum(r / math.log2(i + 1) for i, r in enumerate(ideal, start=1))
    return (dcg / idcg) if idcg > 0 else 0.0


def main():
    K = 4
    ec.print_header("CROSS-ENCODER RERANKING EVALUATION")
    print(f"Run at: {ec.now_stamp()}")
    candidate_k = getattr(config, "RERANK_CANDIDATE_K", 20)
    print(f"Embedding model : {config.EMBEDDING_MODEL}")
    print(f"Reranker model  : {config.RERANK_MODEL}")
    print(f"candidate_k={candidate_k}  final_k={K}\n")

    import time
    import chromadb
    from sentence_transformers import SentenceTransformer, CrossEncoder

    print("[load] embedding model...")
    embed = SentenceTransformer(config.EMBEDDING_MODEL)
    print("[load] cross-encoder reranker...")
    reranker = CrossEncoder(config.RERANK_MODEL)
    print("[load] chroma collection (read-only)...")
    client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
    col = client.get_collection("churn_papers")
    print(f"       churn_papers: {col.count()} chunks\n")

    data = ec.load_dataset("reranking_gold.json")
    mode = data.get("relevance_mode", "any")
    queries = data["queries"]

    per_query = []
    skipped = []

    for q in queries:
        query = q["query"]
        mc = q["must_contain"]

        t0 = time.perf_counter()
        q_emb = embed.encode([query]).tolist()
        res = col.query(query_embeddings=q_emb, n_results=candidate_k)
        retrieve_ms = (time.perf_counter() - t0) * 1000.0

        docs = res["documents"][0] if res.get("documents") else []
        if not docs:
            skipped.append({"id": q["id"], "reason": "no candidates"})
            continue

        base_rel = [is_relevant(d, mc, mode) for d in docs]
        if sum(base_rel) == 0:
            # no relevant chunk in candidate pool -> uninformative for this oracle
            skipped.append({"id": q["id"], "reason": "0 relevant in candidate pool"})
            continue

        # treatment: rerank candidates with cross-encoder
        t1 = time.perf_counter()
        scores = reranker.predict([(query, d) for d in docs])
        rerank_ms = (time.perf_counter() - t1) * 1000.0
        order = sorted(range(len(docs)), key=lambda i: scores[i], reverse=True)
        treat_rel = [base_rel[i] for i in order]

        row = {
            "id": q["id"],
            "n_relevant_candidates": int(sum(base_rel)),
            "base_hit": hit_at_k(base_rel, K),
            "base_mrr": mrr(base_rel),
            "base_ndcg": ndcg_at_k(base_rel, K),
            "base_p": precision_at_k(base_rel, K),
            "treat_hit": hit_at_k(treat_rel, K),
            "treat_mrr": mrr(treat_rel),
            "treat_ndcg": ndcg_at_k(treat_rel, K),
            "treat_p": precision_at_k(treat_rel, K),
            "retrieve_ms": retrieve_ms,
            "rerank_ms": rerank_ms,
        }
        per_query.append(row)

    if not per_query:
        print("No informative queries (check gold-set keywords vs corpus). Aborting.")
        ec.save_json("reranking_skipped.json", skipped)
        return

    def avg(key):
        return sum(r[key] for r in per_query) / len(per_query)

    summary = {
        "baseline": {
            "Hit@%d" % K: round(avg("base_hit"), 4),
            "MRR": round(avg("base_mrr"), 4),
            "nDCG@%d" % K: round(avg("base_ndcg"), 4),
            "Precision@%d" % K: round(avg("base_p"), 4),
            "latency_ms": round(avg("retrieve_ms"), 2),
        },
        "rerank": {
            "Hit@%d" % K: round(avg("treat_hit"), 4),
            "MRR": round(avg("treat_mrr"), 4),
            "nDCG@%d" % K: round(avg("treat_ndcg"), 4),
            "Precision@%d" % K: round(avg("treat_p"), 4),
            "latency_ms": round(avg("retrieve_ms") + avg("rerank_ms"), 2),
        },
    }

    # significance test on per-query nDCG
    sig = {}
    try:
        from scipy.stats import wilcoxon
        b = [r["base_ndcg"] for r in per_query]
        t = [r["treat_ndcg"] for r in per_query]
        if any(bi != ti for bi, ti in zip(b, t)):
            stat, p = wilcoxon(t, b)
            sig = {"test": "wilcoxon_ndcg", "statistic": float(stat), "p_value": float(p)}
        else:
            sig = {"test": "wilcoxon_ndcg", "note": "identical distributions"}
    except Exception as e:
        sig = {"test": "wilcoxon_ndcg", "error": str(e)}

    print(f"Informative queries: {len(per_query)} / {len(queries)} (skipped {len(skipped)})\n")
    hdr = f"{'Config':<26}{'Hit@%d'%K:<9}{'MRR':<9}{'nDCG@%d'%K:<9}{'P@%d'%K:<9}{'Lat(ms)':<9}"
    print(hdr)
    print("-" * len(hdr))
    for name, key in [("Bi-encoder (baseline)", "baseline"), ("Bi-encoder + Reranker", "rerank")]:
        m = summary[key]
        print(f"{name:<26}{m['Hit@%d'%K]:<9}{m['MRR']:<9}{m['nDCG@%d'%K]:<9}{m['Precision@%d'%K]:<9}{m['latency_ms']:<9}")
    print()
    if "p_value" in sig:
        print(f"Wilcoxon (nDCG treatment vs baseline): p = {sig['p_value']:.4g}\n")

    out = {
        "run_at": ec.now_stamp(),
        "embedding_model": config.EMBEDDING_MODEL,
        "reranker_model": config.RERANK_MODEL,
        "candidate_k": candidate_k, "final_k": K,
        "n_queries_total": len(queries),
        "n_queries_informative": len(per_query),
        "summary": summary,
        "significance": sig,
        "skipped": skipped,
    }
    ec.save_json("reranking_metrics.json", out)
    ec.save_csv(
        "reranking_per_query.csv", per_query,
        fieldnames=list(per_query[0].keys()),
    )
    _plot(summary, K)
    print(f"Results written to: {ec.RESULTS_DIR}")


def _plot(summary, K):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        metrics = [f"Hit@{K}", "MRR", f"nDCG@{K}", f"Precision@{K}"]
        base = [summary["baseline"][m] for m in metrics]
        treat = [summary["rerank"][m] for m in metrics]
        x = np.arange(len(metrics))
        w = 0.35
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(x - w / 2, base, w, label="Bi-encoder")
        ax.bar(x + w / 2, treat, w, label="Bi-encoder + Reranker")
        ax.set_xticks(x, metrics)
        ax.set_ylabel("Score")
        ax.set_ylim(0, 1.05)
        ax.set_title("Retrieval quality: baseline vs reranking")
        ax.legend()
        for i, (bv, tv) in enumerate(zip(base, treat)):
            ax.text(i - w / 2, bv + 0.01, f"{bv:.2f}", ha="center", fontsize=8)
            ax.text(i + w / 2, tv + 0.01, f"{tv:.2f}", ha="center", fontsize=8)
        fig.tight_layout()
        fig.savefig(ec.results_path("reranking_comparison.png"), dpi=150)
        plt.close(fig)
        print("Saved figure: results/reranking_comparison.png")
    except Exception as e:
        print(f"[skip plot] {e}")


if __name__ == "__main__":
    main()
