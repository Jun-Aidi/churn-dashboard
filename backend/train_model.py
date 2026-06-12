"""
Train churn model — replikasi pipeline modeling dari
notebooks/merged_newV2.ipynb (RF + WOA Composite Multi-Metric).

Tujuan: menghasilkan models/churn_model_bundle.pkl yang semirip mungkin
dengan output notebook, TANPA bergantung pada folder notebooks/.

Sumber data : data/merged_dataset.csv (output STEP 7 notebook).
Output      : models/churn_model_bundle.pkl
              dict {model, label_encoders, threshold, feature_columns}

Tahapan yang direplikasi dari notebook:
  STEP 8  — Drop kolom leakage
  STEP 12 — Feature Engineering v2 (12 fitur)
  STEP 13 — Encoding + train_test_split (random_state=42) + reset_index
  STEP 21 — WOA Composite Multi-Metric optimization (class_weight {0:1,1:2})
  STEP 22 — Train RF-WOA + threshold optimization (recall >= 0.90)
  STEP 24 — Simpan deployment bundle + sanity check

Catatan: WOA (n_whales=20 x max_iter=30 x 5-fold CV) berat —
         estimasi ~2-3 jam tergantung hardware. Atur lewat env var:
           WOA_N_WHALES, WOA_MAX_ITER, WOA_CV
         untuk eksperimen lebih cepat (hasil akan sedikit berbeda).

Jalankan: python train_model.py
"""

import os
import time
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_auc_score, precision_recall_curve,
                             precision_score, recall_score, f1_score,
                             fbeta_score, accuracy_score)
import warnings
warnings.filterwarnings('ignore')

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.environ.get('MERGED_DATA_PATH', os.path.join(BASE_DIR, 'data', 'merged_dataset.csv'))
BUNDLE_PATH = os.environ.get('MODEL_OUT_PATH', os.path.join(BASE_DIR, 'models', 'churn_model_bundle.pkl'))

# ── Konfigurasi WOA (default = identik notebook) ──
RANDOM_STATE = 42
WOA_CLASS_WEIGHT = {0: 1, 1: 2}          # churn 2x — Strategi B
N_WHALES = int(os.environ.get('WOA_N_WHALES', 20))
MAX_ITER = int(os.environ.get('WOA_MAX_ITER', 30))
WOA_CV   = int(os.environ.get('WOA_CV', 5))

# ── Composite multi-metric (berbasis revenue at risk) ──
PLAN_WEIGHTS = {'f2_enterprise': 0.40, 'auc_roc': 0.28,
                'f1_professional': 0.20, 'f1_starter': 0.12}
# LabelEncoder (alfabetis): enterprise=0, professional=1, starter=2
ENT, PRO, STA = 0, 1, 2

# 12 fitur engineered (STEP 12)
FE_COLS = [
    'engagement_score', 'usage_per_tenure', 'payment_health', 'ever_dunning',
    'late_payment_rate', 'support_intensity', 'has_open_critical', 'unresolved_rate',
    'nps_usage_interaction', 'nps_tenure_interaction', 'login_recency_ratio', 'revenue_per_day'
]

# Kolom leakage / non-feature (STEP 8)
DROP_COLS = [
    'customer_id', 'unsubscribed_date', 'subscription_date',
    'effective_start', 'first_billing_date', 'last_billing_date',
    'last_payment_date', 'last_survey_date', 'last_ticket_date', 'last_login_date',
]

print("=" * 60)
print("CHURN MODEL TRAINING — RF + WOA (replikasi notebook v3.0)")
print("=" * 60)


# ─────────────────────────────────────────────────────────
# FEATURE ENGINEERING v2 (STEP 12) — harus identik training & inference
# ─────────────────────────────────────────────────────────
def add_engineered_features(df):
    df = df.copy()
    df['engagement_score']       = (df['monthly_usage_hrs'] * df['feature_adoption_pct'] / (df['days_since_login'] + 1)).clip(upper=1e6)
    df['usage_per_tenure']       = df['monthly_usage_hrs'] / (df['tenure_days'] / 30 + 1)
    df['payment_health']         = (df['avg_payment_value'] / (df['dunning_count'] + 1) / (df['avg_days_late'].fillna(0) + 1)).clip(upper=1e6)
    df['ever_dunning']           = (df['dunning_count'] > 0).astype(int)
    df['late_payment_rate']      = df['late_payment_count'] / (df['payment_count'] + 1)
    df['support_intensity']      = df['ticket_count'] / (df['tenure_days'] / 30 + 1)
    df['has_open_critical']      = ((df['critical_tickets'] > 0) & (df['open_ticket_ratio'] > 0)).astype(int)
    df['unresolved_rate']        = df['open_tickets'] / (df['ticket_count'] + 1)
    df['nps_usage_interaction']  = df['nps_latest'] * df['monthly_usage_hrs']
    df['nps_tenure_interaction'] = df['nps_latest'] * df['tenure_days']
    df['login_recency_ratio']    = df['days_since_login'] / (df['tenure_days'] + 1)
    df['revenue_per_day']        = df['total_billed'] / (df['tenure_days'] + 1)

    for col in FE_COLS:
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        if df[col].isna().sum() > 0:
            df[col] = df[col].fillna(df[col].median())
    return df


# ─────────────────────────────────────────────────────────
# COMPOSITE SCORE (utilitas evaluasi & objective WOA)
# ─────────────────────────────────────────────────────────
def composite_score_fn(y_true, y_prob, y_pred, plan_arr):
    """Returns: (composite, auc, f2_ent, f1_pro, f1_sta, rec_ent, rec_pro, rec_sta)"""
    auc   = roc_auc_score(y_true, y_prob)
    m_ent = (plan_arr == ENT); m_pro = (plan_arr == PRO); m_sta = (plan_arr == STA)

    f2_ent  = fbeta_score(y_true[m_ent], y_pred[m_ent], beta=2, zero_division=0) if m_ent.sum() > 0 else 0.0
    f1_pro  = f1_score(y_true[m_pro], y_pred[m_pro], zero_division=0)            if m_pro.sum() > 0 else 0.0
    f1_sta  = f1_score(y_true[m_sta], y_pred[m_sta], zero_division=0)            if m_sta.sum() > 0 else 0.0
    rec_ent = recall_score(y_true[m_ent], y_pred[m_ent], zero_division=0)        if m_ent.sum() > 0 else 0.0
    rec_pro = recall_score(y_true[m_pro], y_pred[m_pro], zero_division=0)        if m_pro.sum() > 0 else 0.0
    rec_sta = recall_score(y_true[m_sta], y_pred[m_sta], zero_division=0)        if m_sta.sum() > 0 else 0.0

    composite = (PLAN_WEIGHTS['f2_enterprise']   * f2_ent +
                 PLAN_WEIGHTS['auc_roc']         * auc    +
                 PLAN_WEIGHTS['f1_professional'] * f1_pro +
                 PLAN_WEIGHTS['f1_starter']      * f1_sta)
    return composite, auc, f2_ent, f1_pro, f1_sta, rec_ent, rec_pro, rec_sta


def find_threshold_for_recall(target_recall, recall_arr, thresholds):
    """Threshold tertinggi yang masih memenuhi target recall."""
    idx = np.where(recall_arr[:-1] >= target_recall)[0]
    if len(idx) > 0:
        return float(thresholds[idx[-1]])
    return 0.5


# ─────────────────────────────────────────────────────────
# STEP 8/12/13 — LOAD, CLEAN, FE, ENCODE, SPLIT
# ─────────────────────────────────────────────────────────
print(f"\nLoad data: {DATA_PATH}")
df = pd.read_csv(DATA_PATH)
df.columns = df.columns.str.strip()              # robust thd spasi header
print(f"Data: {df.shape} | Churn rate: {df['churn'].mean():.2%}")

# Normalisasi kategorik (sesuai STEP 1B notebook & predict_service)
for col in ['plan_type', 'contract_type']:
    df[col] = df[col].astype(str).str.strip().str.lower()

# STEP 8 — drop leakage
df_model = df.drop(columns=[c for c in DROP_COLS if c in df.columns])

# STEP 12 — feature engineering
df_fe = add_engineered_features(df_model)
print(f"Shape setelah FE: {df_fe.shape} | Missing: {df_fe.isnull().sum().sum()}")

# STEP 13 — encoding
label_encoders = {}
for col in ['plan_type', 'contract_type']:
    le = LabelEncoder()
    df_fe[col] = le.fit_transform(df_fe[col].astype(str))
    label_encoders[col] = le
    print(f"  {col}: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# STEP 13 — split + reset_index
X = df_fe.drop(columns=['churn'])
y = df_fe['churn']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
X_train = X_train.reset_index(drop=True)
X_test  = X_test.reset_index(drop=True)
y_train = y_train.reset_index(drop=True)
y_test  = y_test.reset_index(drop=True)

print(f"\nTrain: {X_train.shape} | Churn: {y_train.mean():.2%}")
print(f"Test : {X_test.shape}  | Churn: {y_test.mean():.2%}")
print(f"Jumlah fitur: {X_train.shape[1]}")

X_train_np   = X_train.values.astype(np.float64)
y_train_np   = y_train.values.astype(int)
plan_col_idx = list(X_train.columns).index('plan_type')


# ─────────────────────────────────────────────────────────
# STEP 21 — WHALE OPTIMIZATION (composite multi-metric)
# ─────────────────────────────────────────────────────────
PARAM_BOUNDS = {
    'n_estimators'     : [50,  500],
    'max_depth'        : [3,   12],
    'min_samples_split': [5,   50],
    'min_samples_leaf' : [3,   25],
    'max_features'     : [0.1,  1.0],
}
PARAM_NAMES = list(PARAM_BOUNDS.keys())
N_DIM = len(PARAM_NAMES)


def decode_whale(position):
    """Posisi WOA [0,1] → hyperparameter RF valid."""
    bounds = list(PARAM_BOUNDS.values())
    params = {}
    for i, name in enumerate(PARAM_NAMES):
        lo, hi = bounds[i]
        val = lo + position[i] * (hi - lo)
        if name in ['n_estimators', 'max_depth', 'min_samples_split', 'min_samples_leaf']:
            val = int(round(np.clip(val, lo, hi)))
        else:
            val = round(float(np.clip(val, lo, hi)), 3)
        params[name] = val
    return params


def fitness_composite_woa(position, X_np, y_np, plan_col_idx,
                          class_weight=None, cv=5, seed=42):
    """Composite multi-metric fitness — dikembalikan negatif (WOA meminimisasi)."""
    params = decode_whale(position)
    rf = RandomForestClassifier(
        n_estimators      = params['n_estimators'],
        max_depth         = params['max_depth'],
        min_samples_split = params['min_samples_split'],
        min_samples_leaf  = params['min_samples_leaf'],
        max_features      = params['max_features'],
        class_weight      = class_weight,
        random_state      = seed,
        n_jobs            = -1
    )
    skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=seed)
    fold_scores = []
    for train_idx, val_idx in skf.split(X_np, y_np):
        X_ftr, X_fval = X_np[train_idx], X_np[val_idx]
        y_ftr, y_fval = y_np[train_idx], y_np[val_idx]

        rf.fit(X_ftr, y_ftr)
        y_prob = rf.predict_proba(X_fval)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        auc = roc_auc_score(y_fval, y_prob)
        plan_val = X_fval[:, plan_col_idx].astype(int)
        m_ent = (plan_val == ENT); m_pro = (plan_val == PRO); m_sta = (plan_val == STA)

        f2_ent = fbeta_score(y_fval[m_ent], y_pred[m_ent], beta=2, zero_division=0) if m_ent.sum() > 0 else 0.0
        f1_pro = f1_score(y_fval[m_pro], y_pred[m_pro], zero_division=0)            if m_pro.sum() > 0 else 0.0
        f1_sta = f1_score(y_fval[m_sta], y_pred[m_sta], zero_division=0)            if m_sta.sum() > 0 else 0.0

        composite = 0.40 * f2_ent + 0.28 * auc + 0.20 * f1_pro + 0.12 * f1_sta
        fold_scores.append(composite)
    return -np.mean(fold_scores)


def whale_optimization_composite(X_np, y_np, plan_col_idx, class_weight=None,
                                 n_whales=20, max_iter=30, cv=5, seed=42, verbose=True):
    """WOA engine — returns (best_params, best_composite, history)."""
    np.random.seed(seed)
    start = time.time()

    positions = np.random.rand(n_whales, N_DIM)
    fitness_scores = np.array([
        fitness_composite_woa(positions[i], X_np, y_np, plan_col_idx,
                              class_weight=class_weight, cv=cv, seed=seed)
        for i in range(n_whales)
    ])

    best_idx = np.argmin(fitness_scores)
    best_position = positions[best_idx].copy()
    best_fitness = fitness_scores[best_idx]
    best_composite = -best_fitness
    history = [best_composite]

    if verbose:
        print(f"Init {n_whales} paus | class_weight={class_weight}")
        print(f"Composite awal terbaik: {best_composite:.4f}")
        print(f"{'Iter':>5} {'Best Composite':>15} {'Curr Best':>11} {'Elapsed':>10}")
        print("-" * 46)

    for t in range(max_iter):
        a  = 2.0 - t * (2.0 / max_iter)
        a2 = -1.0 - t * (1.0 / max_iter)
        for i in range(n_whales):
            r1 = np.random.rand(N_DIM); r2 = np.random.rand(N_DIM)
            p = np.random.rand()
            A = 2 * a * r1 - a
            C = 2 * r2
            if p < 0.5:
                if np.abs(A).max() < 1:
                    D = np.abs(C * best_position - positions[i])
                    positions[i] = best_position - A * D
                else:
                    rand_idx = np.random.randint(0, n_whales)
                    D = np.abs(C * positions[rand_idx] - positions[i])
                    positions[i] = positions[rand_idx] - A * D
            else:
                b = 1.0
                l = (a2 - 1) * np.random.rand(N_DIM) + 1
                D = np.abs(best_position - positions[i])
                positions[i] = D * np.exp(b * l) * np.cos(2 * np.pi * l) + best_position
            positions[i] = np.clip(positions[i], 0, 1)

            new_fit = fitness_composite_woa(positions[i], X_np, y_np, plan_col_idx,
                                            class_weight=class_weight, cv=cv, seed=seed)
            fitness_scores[i] = new_fit
            if new_fit < best_fitness:
                best_fitness = new_fit
                best_position = positions[i].copy()
                best_composite = -best_fitness

        history.append(best_composite)
        if verbose:
            print(f"{t+1:>5} {best_composite:>15.4f} {-min(fitness_scores):>11.4f} {time.time()-start:>9.1f}s")

    return decode_whale(best_position), best_composite, history


print("\n" + "=" * 60)
print("STEP 21 — WOA COMPOSITE MULTI-METRIC OPTIMIZATION")
print("=" * 60)
print(f"  Fitness     : 0.40xF2[Ent] + 0.28xAUC + 0.20xF1[Pro] + 0.12xF1[Sta]")
print(f"  class_weight: {WOA_CLASS_WEIGHT}")
print(f"  n_whales={N_WHALES} | max_iter={MAX_ITER} | cv={WOA_CV} | seed={RANDOM_STATE}")
print(f"  (WOA berat — bisa memakan waktu lama)\n")

woa_best_params, woa_best_composite, _ = whale_optimization_composite(
    X_train_np, y_train_np, plan_col_idx,
    class_weight=WOA_CLASS_WEIGHT,
    n_whales=N_WHALES, max_iter=MAX_ITER, cv=WOA_CV, seed=RANDOM_STATE, verbose=True
)
print(f"\nWOA selesai. Best Composite: {woa_best_composite:.4f}")
print(f"Best Params: {woa_best_params}")


# ─────────────────────────────────────────────────────────
# STEP 22 — TRAIN RF-WOA + THRESHOLD OPTIMIZATION
# ─────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 22 — RF-WOA TRAIN + THRESHOLD OPTIMIZATION")
print("=" * 60)

rf_woa = RandomForestClassifier(
    **woa_best_params, class_weight=WOA_CLASS_WEIGHT,
    random_state=RANDOM_STATE, n_jobs=-1
)
rf_woa.fit(X_train, y_train)

woa_prob_test = rf_woa.predict_proba(X_test)[:, 1]
prec_w, rec_w, thresh_w = precision_recall_curve(np.array(y_test), woa_prob_test)

thresh_best_f1 = thresh_w[np.argmax((2 * prec_w * rec_w / (prec_w + rec_w + 1e-9))[:-1])] if len(thresh_w) > 0 else 0.5
thresh_90 = find_threshold_for_recall(0.90, rec_w, thresh_w)
thresh_92 = find_threshold_for_recall(0.92, rec_w, thresh_w)

y_te_np = np.array(y_test)
plan_te = X_test['plan_type'].values

print(f"{'Scenario':<22} {'Thresh':>7} {'Prec':>7} {'Recall':>8} {'F1':>7} {'Composite':>11} {'FN':>5}")
print("-" * 68)
woa_thresh_results = {}
for sc_name, thresh in {
    'Default (0.50)': 0.50,
    'Best F1'       : thresh_best_f1,
    'Recall >= 0.90': thresh_90,
    'Recall >= 0.92': thresh_92,
}.items():
    pred_t = (woa_prob_test >= thresh).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_test, pred_t).ravel()
    p_t = tp / (tp + fp + 1e-9); r_t = tp / (tp + fn + 1e-9)
    f_t = 2 * p_t * r_t / (p_t + r_t + 1e-9)
    comp_t, *_ = composite_score_fn(y_te_np, woa_prob_test, pred_t, plan_te)
    woa_thresh_results[sc_name] = {'thresh': thresh, 'prec': p_t, 'rec': r_t,
                                   'f1': f_t, 'composite': comp_t, 'fn': fn}
    marker = ' *' if r_t >= 0.90 else ''
    print(f"{sc_name:<22} {thresh:>7.3f} {p_t:>7.4f} {r_t:>8.4f} {f_t:>7.4f} {comp_t:>11.4f} {fn:>5}{marker}")

# Pilih threshold: recall >= 0.90 + composite tertinggi
eligible = {k: v for k, v in woa_thresh_results.items() if v['rec'] >= 0.90}
best_sc = max(eligible, key=lambda k: woa_thresh_results[k]['composite']) if eligible else 'Recall >= 0.90'
thresh_woa_final = woa_thresh_results[best_sc]['thresh']
print(f"\nThreshold terpilih: {best_sc} (thresh={thresh_woa_final:.4f})")

# Evaluasi akhir
pred_final = (woa_prob_test >= thresh_woa_final).astype(int)
print("\n" + classification_report(y_te_np, pred_final, target_names=['Active', 'Churn'], zero_division=0))
comp_f, auc_f, f2e_f, f1p_f, f1s_f, rec_ent_f, rec_pro_f, rec_sta_f = \
    composite_score_fn(y_te_np, woa_prob_test, pred_final, plan_te)
print(f"Test AUC        : {auc_f:.4f}")
print(f"Composite Score : {comp_f:.4f}")
print(f"Recall (global) : {recall_score(y_te_np, pred_final, zero_division=0):.4f}")
print(f"F2[Ent]={f2e_f:.4f} | F1[Pro]={f1p_f:.4f} | F1[Sta]={f1s_f:.4f}")


# ─────────────────────────────────────────────────────────
# STEP 24 — SIMPAN BUNDLE + SANITY CHECK
# ─────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 24 — SIMPAN DEPLOYMENT BUNDLE")
print("=" * 60)

bundle = {
    'model'          : rf_woa,
    'label_encoders' : label_encoders,
    'threshold'      : thresh_woa_final,
    'feature_columns': list(X_train.columns),
}

os.makedirs(os.path.dirname(BUNDLE_PATH), exist_ok=True)
joblib.dump(bundle, BUNDLE_PATH)
print(f"Bundle disimpan: {BUNDLE_PATH}")
print(f"  Model       : RF WOA {woa_best_params}")
print(f"  class_weight: {WOA_CLASS_WEIGHT}")
print(f"  Threshold   : {thresh_woa_final:.6f}")
print(f"  Fitur       : {len(bundle['feature_columns'])} kolom")
print(f"  Encoders    : {list(label_encoders.keys())}")

# Sanity check — muat ulang & verifikasi composite konsisten
loaded = joblib.load(BUNDLE_PATH)
prob_check = loaded['model'].predict_proba(X_test)[:, 1]
pred_check = (prob_check >= loaded['threshold']).astype(int)
comp_check, *_ = composite_score_fn(y_te_np, prob_check, pred_check, plan_te)
print(f"\nSanity check — composite: {comp_check:.4f}")
if abs(comp_check - comp_f) < 1e-6:
    print("Bundle verified — siap dipakai backend (config.MODEL_PATH).")
else:
    print(f"WARNING: composite mismatch (expected {comp_f:.4f}, got {comp_check:.4f})")

print("\nSELESAI.")
