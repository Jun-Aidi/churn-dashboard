"""
RAG-QA / Tool-calling accuracy evaluation (Metrik_Evaluasi.md §4).

The end-to-end LLM pipeline is generative, so classic classification metrics
do not apply directly. The most report-friendly, objective sub-metric is
TOOL-CALLING ACCURACY: given a question, does the LLM call the correct
function (get_customer_profile / get_risk_statistics / get_high_risk_customers /
search_papers / get_segment_analysis)?

This harness reuses the runtime SYSTEM_PROMPT + TOOLS read-only and issues a
single tool_choice="auto" completion per question, recording which tool the
model selected (it does NOT execute the tools or touch user data).

Requires a configured DEEPSEEK_API_KEY (backend/.env). If the LLM is not
available the script skips gracefully and explains what to set.

For faithfulness / answer-relevance / context-precision (RAGAS or
LLM-as-judge), see the note printed at the end — those require an API key and
the optional `ragas` package and are intentionally left as an opt-in step.

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\rag_qa\\run_toolcalling_eval.py
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

import config


def main():
    ec.print_header("RAG-QA TOOL-CALLING ACCURACY EVALUATION")
    print(f"Run at: {ec.now_stamp()}")
    print(f"LLM model: {config.DEEPSEEK_MODEL}\n")

    from app.nlp import llm_client
    if not llm_client.init_llm() or not llm_client.is_available():
        print("LLM not configured — skipping tool-calling eval.")
        print("Set DEEPSEEK_API_KEY in backend/.env and re-run to produce numbers.")
        ec.save_json("rag_qa_toolcalling_metrics.json", {
            "run_at": ec.now_stamp(), "status": "skipped_no_llm",
            "reason": "DEEPSEEK_API_KEY not configured",
        })
        return

    client = llm_client._client  # read-only reuse of initialized client
    data = ec.load_dataset("rag_qa_toolcalling.json")
    samples = data["samples"]

    rows, correct = [], 0
    per_tool = {}
    for s in samples:
        q = s["query"]
        accepted = s.get("accepted_tools", [s["expected_tool"]])
        called = _first_tool(client, q)
        ok = called in accepted
        correct += ok
        bucket = per_tool.setdefault(s["expected_tool"], {"total": 0, "correct": 0})
        bucket["total"] += 1
        bucket["correct"] += int(ok)
        rows.append({"query": q, "expected": s["expected_tool"],
                     "accepted": "|".join(accepted), "called": called, "correct": ok})
        print(f"  [{'OK ' if ok else 'XX '}] called={called!s:<24} expected={s['expected_tool']}  | {q[:50]}")

    n = len(samples)
    acc = correct / n if n else 0.0
    per_tool_acc = {k: round(v["correct"] / v["total"], 4) for k, v in per_tool.items()}

    print(f"\nTool-calling accuracy: {acc:.4f}  ({correct}/{n})")
    print("Per-tool accuracy:")
    for k, v in per_tool_acc.items():
        print(f"  {k:<24} {v}")

    ec.save_json("rag_qa_toolcalling_metrics.json", {
        "run_at": ec.now_stamp(),
        "llm_model": config.DEEPSEEK_MODEL,
        "n_samples": n, "n_correct": correct,
        "tool_calling_accuracy": round(acc, 4),
        "per_tool_accuracy": per_tool_acc,
    })
    ec.save_csv("rag_qa_toolcalling_detail.csv", rows,
                fieldnames=["query", "expected", "accepted", "called", "correct"])

    print("\nNote: faithfulness / answer-relevance / context-precision (RAGAS or")
    print("LLM-as-judge, 1-5 scale) require the optional `ragas` package + API key.")
    print(f"Results written to: {ec.RESULTS_DIR}")


def _first_tool(client, query):
    """Return the name of the first tool the model chooses, or 'none'."""
    from app.nlp.llm_client import SYSTEM_PROMPT, TOOLS
    try:
        resp = client.chat.completions.create(
            model=config.DEEPSEEK_MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT},
                      {"role": "user", "content": query}],
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.0,
            max_tokens=200,
        )
        msg = resp.choices[0].message
        if msg.tool_calls:
            return msg.tool_calls[0].function.name
        return "none"
    except Exception as e:
        return f"error:{str(e)[:40]}"


if __name__ == "__main__":
    main()
