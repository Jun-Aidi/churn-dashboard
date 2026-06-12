"""
Run the whole evaluation suite in the recommended order
(Metrik_Evaluasi.md): guardrail -> reranking -> caching -> rag_qa.

Each step runs in-process; failures in one step do not stop the others.

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\run_all.py
"""

import os
import sys
import runpy
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _eval_common as ec

STEPS = [
    ("Guardrail (Layer 1)", "guardrail/run_guardrail_eval.py"),
    ("Guardrail (end-to-end 3 lapis)", "guardrail/run_guardrail_e2e_eval.py"),
    ("Reranking", "reranking/run_reranking_eval.py"),
    ("Caching", "caching/run_caching_eval.py"),
    ("RAG-QA tool-calling", "rag_qa/run_toolcalling_eval.py"),
]


def main():
    ec.print_header("CHURN DASHBOARD — NLP EVALUATION SUITE")
    print(f"Run at: {ec.now_stamp()}\n")
    for name, rel in STEPS:
        print("\n" + "#" * 70)
        print(f"# STEP: {name}")
        print("#" * 70)
        path = os.path.join(ec.EVAL_DIR, *rel.split("/"))
        try:
            runpy.run_path(path, run_name="__main__")
        except Exception:
            print(f"[{name}] FAILED:")
            traceback.print_exc()
    print("\nAll steps attempted. See evaluation/results/ for outputs.")


if __name__ == "__main__":
    main()
