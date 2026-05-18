"""
Deep Learning Intent Classifier.
Menggunakan model BiLSTM + Word Embedding yang telah dilatih (.keras)
sebagai pengganti pendekatan rule-based lama.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Dict

# ══════════════════════════════════════════════════════════════════════════════
# KONFIGURASI PATH MODEL
# ══════════════════════════════════════════════════════════════════════════════

# Path menuju folder chatbot_models/deep_learning
# Struktur: backend/app/nlp/intent_classifier.py
#           backend/app/chatbot_models/deep_learning/
_NLP_DIR      = Path(__file__).resolve().parent          # backend/app/nlp
_APP_DIR      = _NLP_DIR.parent                          # backend/app
_MODEL_DIR    = _APP_DIR / "chatbot_models" / "deep_learning"

MODEL_PATH     = _MODEL_DIR / "intent_model.keras"
TOKENIZER_PATH = _MODEL_DIR / "intent_tokenizer.json"
LABEL_MAP_PATH = _MODEL_DIR / "intent_label_map.json"

# Hyperparameter (harus sama dengan saat training di notebook)
MAX_LEN          = 20
INTENT_THRESHOLD = 0.40   # Jika skor DL < threshold, pakai keyword fallback

# ══════════════════════════════════════════════════════════════════════════════
# LOAD MODEL SAAT STARTUP (Lazy-loaded sekali saja)
# ══════════════════════════════════════════════════════════════════════════════

_DL_READY        = False
_intent_model    = None
_tokenizer_infer = None
_idx_to_label: Dict[str, str] = {}

try:
    import numpy as np
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.preprocessing.text import tokenizer_from_json

    _missing = [p for p in [MODEL_PATH, TOKENIZER_PATH, LABEL_MAP_PATH] if not p.exists()]

    if _missing:
        print(f"[NLP WARNING] File model belum ada: {_missing}")
        print("[NLP WARNING] Chatbot akan menggunakan keyword fallback.")
    else:
        _intent_model = load_model(MODEL_PATH)

        with open(TOKENIZER_PATH, "r", encoding="utf-8") as f:
            _tokenizer_infer = tokenizer_from_json(f.read())

        with open(LABEL_MAP_PATH, "r", encoding="utf-8") as f:
            _label_data = json.load(f)
        _idx_to_label = _label_data["idx_to_label"]

        _DL_READY = True
        print(f"[NLP] Model Deep Learning berhasil dimuat dari: {_MODEL_DIR}")
        print(f"[NLP] Intent tersedia: {list(_idx_to_label.values())}")

except ImportError:
    print("[NLP WARNING] TensorFlow tidak terinstal. Chatbot menggunakan keyword fallback.")
    np = None

# ══════════════════════════════════════════════════════════════════════════════
# ENTITY EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def extract_entities(text: str) -> dict:
    """Ekstrak entitas dari teks user (Customer ID, plan, contract, risk level)."""
    entities = {}

    # Customer ID — Format: C-XXXXX (angka)
    cust_match = re.search(r'c-\d+', text, re.IGNORECASE)
    if cust_match:
        entities['customer_id'] = cust_match.group(0).upper()

    # Plan type
    plan_match = re.search(r'\b(starter|professional|enterprise)\b', text, re.IGNORECASE)
    if plan_match:
        entities['plan_type'] = plan_match.group(1).capitalize()

    # Contract type
    contract_match = re.search(r'\b(monthly|annual|bulanan|tahunan)\b', text, re.IGNORECASE)
    if contract_match:
        entities['contract_type'] = contract_match.group(1)

    # Risk level
    if re.search(r'\b(tinggi|high|kritis|critical)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'high'
    elif re.search(r'\b(sedang|medium|moderate)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'medium'
    elif re.search(r'\b(rendah|low|aman|safe)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'low'

    return entities


# ══════════════════════════════════════════════════════════════════════════════
# KEYWORD FALLBACK (Dipakai saat model DL tidak yakin / belum dimuat)
# ══════════════════════════════════════════════════════════════════════════════

def _keyword_fallback(text: str) -> str:
    """Deteksi intent sederhana berbasis kata kunci sebagai fallback."""
    t = text.lower()

    if any(k in t for k in ['halo', 'hai', 'hello', 'hi', 'hey', 'selamat pagi',
                             'selamat siang', 'selamat sore', 'selamat malam', 'assalamualaikum']):
        return 'GREETING'
    if any(k in t for k in ['email', 'draf', 'draft', 'penawaran', 'kirim pesan', 'tulis email']):
        return 'DRAF_EMAIL'
    if any(k in t for k in ['vip', 'premium', 'enterprise', 'bernilai', 'whale', 'kerugian terbesar']):
        return 'VIP_RISK'
    if any(k in t for k in ['berapa', 'jumlah', 'total', 'hitung', 'count', 'statistik']):
        return 'JUMLAH_RISIKO_TINGGI'
    if any(k in t for k in ['strategi', 'saran', 'rekomendasi', 'tips', 'cara mencegah',
                             'solusi', 'tindakan', 'biar tidak churn']):
        return 'STRATEGI_RETENSI'
    if any(k in t for k in ['tren', 'trend', 'grafik', 'historis', 'naik turun', 'pola churn']):
        return 'TREN_CHURN'
    if any(k in t for k in ['segmen', 'segment', 'plan type', 'per paket', 'monthly vs annual',
                             'breakdown', 'distribusi']):
        return 'SEGMEN_ANALISIS'
    if any(k in t for k in ['model', 'algoritma', 'machine learning', 'akurasi', 'neural', 'deep learning']):
        return 'MODEL_INFO'
    if any(k in t for k in ['ringkasan', 'overview', 'summary', 'kondisi', 'dashboard',
                             'laporan', 'highlight', 'rangkuman']):
        return 'METRIK_OVERVIEW'
    if any(k in t for k in ['analisis', 'profil', 'cek', 'detail', 'lihat data', 'info lengkap',
                             'status customer', 'c-']):
        return 'ANALISIS_PELANGGAN'
    if any(k in t for k in ['faktor', 'penyebab', 'feature importance', 'kenapa churn',
                             'apa yang menyebabkan', 'indikator', 'driver churn']):
        return 'FAKTOR_CHURN'

    return 'UNKNOWN'


# ══════════════════════════════════════════════════════════════════════════════
# FUNGSI UTAMA: classify_intent
# ══════════════════════════════════════════════════════════════════════════════

def classify_intent(message: str) -> dict:
    """
    Klasifikasi intent menggunakan model Deep Learning (BiLSTM).
    Jika model belum dimuat atau skor di bawah threshold, gunakan keyword fallback.

    Returns:
        dict dengan key: intent, confidence, entities
    """
    text = message.strip()
    if not text:
        return {'intent': 'UNKNOWN', 'confidence': 0.0, 'entities': {}}

    entities = extract_entities(text)

    # ── Jika model DL belum siap, langsung pakai fallback ──
    if not _DL_READY or np is None:
        fallback = _keyword_fallback(text)
        return {
            'intent': fallback,
            'confidence': 0.0,
            'entities': entities,
        }

    # ── Deep Learning Inference ──
    sequence     = _tokenizer_infer.texts_to_sequences([text])
    padded_input = pad_sequences(sequence, maxlen=MAX_LEN, padding="post", truncating="post")

    probs      = _intent_model.predict(padded_input, verbose=0)[0]
    best_idx   = int(np.argmax(probs))
    best_score = float(probs[best_idx])
    best_label = _idx_to_label.get(str(best_idx), "UNKNOWN")

    # ── Jika skor DL terlalu rendah, gunakan keyword fallback ──
    if best_score < INTENT_THRESHOLD:
        best_label = _keyword_fallback(text)
        source     = "keyword_fallback"
    else:
        source = "deep_learning"

    print(f"[NLP] intent={best_label} | score={best_score:.2%} | source={source}")

    return {
        'intent':     best_label,
        'confidence': best_score,
        'entities':   entities,
    }
