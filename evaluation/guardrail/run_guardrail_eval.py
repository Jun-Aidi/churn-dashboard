"""
Guardrail / Prompt-Injection evaluation (Metrik_Evaluasi.md §3).

Treats the input filter as a binary classifier:
  positive class (1) = injection / out-of-scope manipulation -> should be BLOCKED
  negative class (0) = legitimate churn question            -> should PASS

Imports the REAL runtime guardrail read-only:
    from app.nlp.chat_engine import _is_prompt_injection
(this import is pure-Python regex; it does not start any server or DB).

Outputs: precision / recall / F1, FPR, FNR, confusion matrix (CSV + JSON + PNG),
and a list of misclassified samples for error analysis.

Run:
    backend\\venv\\Scripts\\python.exe evaluation\\guardrail\\run_guardrail_eval.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import _eval_common as ec

from sklearn.metrics import (
    precision_score, recall_score, f1_score, accuracy_score, confusion_matrix,
)


def main():
    ec.print_header("GUARDRAIL / PROMPT-INJECTION EVALUATION")
    print(f"Run at: {ec.now_stamp()}\n")

    # Read-only import of the runtime guardrail.
    from app.nlp.chat_engine import _is_prompt_injection

    data = ec.load_dataset("guardrail_testset.json")
    samples = data["samples"]

    y_true, y_pred, misclassified = [], [], []
    for s in samples:
        true = int(s["label"])
        pred = 1 if _is_prompt_injection(s["text"]) else 0
        y_true.append(true)
        y_pred.append(pred)
        if pred != true:
            misclassified.append({
                "text": s["text"],
                "true": true,
                "pred": pred,
                "kind": "false_negative (attack passed)" if true == 1 else "false_positive (legit blocked)",
            })

    n = len(y_true)
    n_pos = sum(y_true)
    n_neg = n - n_pos

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    acc = accuracy_score(y_true, y_pred)

    # confusion_matrix with labels [0,1] -> [[TN, FP],[FN, TP]]
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    fpr = fp / (fp + tn) if (fp + tn) else 0.0  # legit wrongly blocked
    fnr = fn / (fn + tp) if (fn + tp) else 0.0  # attacks that slipped through

    print(f"Samples: {n}  (injection={n_pos}, legit={n_neg})\n")
    print(f"  Precision : {precision:.4f}")
    print(f"  Recall    : {recall:.4f}")
    print(f"  F1-score  : {f1:.4f}")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  FPR (legit blocked)   : {fpr:.4f}")
    print(f"  FNR (attacks slipped) : {fnr:.4f}\n")
    print("  Confusion matrix [rows=true, cols=pred], labels [pass=0, block=1]")
    print(f"            pred:pass  pred:block")
    print(f"  true:pass    {tn:>6}     {fp:>6}")
    print(f"  true:block   {fn:>6}     {tp:>6}\n")

    metrics = {
        "run_at": ec.now_stamp(),
        "n_samples": n, "n_injection": int(n_pos), "n_legit": int(n_neg),
        "precision": round(precision, 4), "recall": round(recall, 4),
        "f1": round(f1, 4), "accuracy": round(acc, 4),
        "fpr_legit_blocked": round(fpr, 4), "fnr_attacks_passed": round(fnr, 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "n_misclassified": len(misclassified),
    }
    ec.save_json("guardrail_metrics.json", metrics)
    ec.save_json("guardrail_misclassified.json", misclassified)
    ec.save_csv(
        "guardrail_metrics.csv",
        [metrics | {"confusion_matrix": str(metrics["confusion_matrix"])}],
        fieldnames=list((metrics | {"confusion_matrix": ""}).keys()),
    )

    if misclassified:
        print(f"  {len(misclassified)} misclassified sample(s) saved to results/guardrail_misclassified.json")
    else:
        print("  No misclassified samples.")

    _plot_confusion(tn, fp, fn, tp)
    print(f"\nResults written to: {ec.RESULTS_DIR}")


def _plot_confusion(tn, fp, fn, tp):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        cm = np.array([[tn, fp], [fn, tp]])
        fig, ax = plt.subplots(figsize=(4.5, 4))
        im = ax.imshow(cm, cmap="Blues")
        ax.set_xticks([0, 1], labels=["pass", "block"])
        ax.set_yticks([0, 1], labels=["legit", "injection"])
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_title("Guardrail Confusion Matrix")
        for i in range(2):
            for j in range(2):
                ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                        color="white" if cm[i, j] > cm.max() / 2 else "black",
                        fontsize=14)
        fig.colorbar(im, fraction=0.046, pad=0.04)
        fig.tight_layout()
        fig.savefig(ec.results_path("guardrail_confusion_matrix.png"), dpi=150)
        plt.close(fig)
        print("  Saved figure: results/guardrail_confusion_matrix.png")
    except Exception as e:
        print(f"  [skip plot] {e}")


if __name__ == "__main__":
    main()
