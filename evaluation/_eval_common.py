"""
Shared helpers for the *isolated* evaluation suite.

This folder (`evaluation/`) is an experiment appendix — it is NEVER imported by
runtime code (`backend/app/**`). It only reads the application read-only
(import config / app.nlp.*) or runs the embedding/reranker models independently.
Deleting `evaluation/` must not affect the running app.

Responsibilities of this module:
  * Put `backend/` on sys.path so eval scripts can `import config` and
    `from app.nlp... import ...` exactly like the app does.
  * Provide small utilities for saving JSON/CSV/figures into `results/` and
    loading the gold datasets from `datasets/`.
"""

import os
import sys
import json
import csv
import time
from datetime import datetime

# --- path bootstrap -----------------------------------------------------------
EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(EVAL_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
DATASETS_DIR = os.path.join(EVAL_DIR, "datasets")
RESULTS_DIR = os.path.join(EVAL_DIR, "results")

# Make the backend importable read-only (config.py lives at backend root, and
# the `app` package lives under backend/app).
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load backend/.env so config picks up the same settings as the running app
# (DEEPSEEK_API_KEY, RERANK_*, CACHE_* ...). Optional — falls back to defaults.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
except Exception:
    pass


def load_dataset(name: str):
    """Load a JSON dataset from evaluation/datasets/<name>."""
    path = os.path.join(DATASETS_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _ensure_results_dir():
    os.makedirs(RESULTS_DIR, exist_ok=True)


def save_json(filename: str, data) -> str:
    _ensure_results_dir()
    path = os.path.join(RESULTS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return path


def save_csv(filename: str, rows, fieldnames) -> str:
    _ensure_results_dir()
    path = os.path.join(RESULTS_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    return path


def results_path(filename: str) -> str:
    _ensure_results_dir()
    return os.path.join(RESULTS_DIR, filename)


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def print_header(title: str):
    print("=" * 70)
    print(title)
    print("=" * 70)


class Timer:
    """Context manager returning elapsed milliseconds via `.ms`."""

    def __enter__(self):
        self._t0 = time.perf_counter()
        return self

    def __exit__(self, *exc):
        self.ms = (time.perf_counter() - self._t0) * 1000.0
