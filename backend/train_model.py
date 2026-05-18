"""
Train Random Forest model untuk prediksi churn.
Membaca data dari data/customers.csv, train dengan RandomizedSearchCV,
dan save model ke models/churn_model.pkl

Jalankan: python train_model.py
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (classification_report, roc_auc_score,
                             accuracy_score, f1_score)
import joblib
import warnings
warnings.filterwarnings('ignore')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'customers.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'churn_model.pkl')
ENCODER_PATH = os.path.join(BASE_DIR, 'models', 'label_encoders.pkl')
FEATURES_PATH = os.path.join(BASE_DIR, 'models', 'feature_names.pkl')

print("=" * 60)
print("CHURN MODEL TRAINING — Random Forest")
print("=" * 60)

# ── Load Data ──
df = pd.read_csv(DATA_PATH)
print(f"\nData loaded: {df.shape}")
print(f"Churn rate: {df['churn'].mean():.2%}")

# ── Drop kolom leakage & non-feature ──
drop_cols = [
    'customer_id', 'unsubscribed_date', 'subscription_date',
    'effective_start', 'first_billing_date', 'last_billing_date',
    'last_payment_date', 'last_survey_date', 'last_ticket_date',
]
df_model = df.drop(columns=[c for c in drop_cols if c in df.columns])

# ── Feature Engineering (sama seperti notebook) ──
print("\nFeature Engineering...")

df_model['engagement_score'] = (
    df_model['monthly_usage_hrs'] *
    df_model['feature_adoption_pct'] /
    (df_model['days_since_login'] + 1)
).clip(upper=1e6)

df_model['usage_per_tenure'] = (
    df_model['monthly_usage_hrs'] /
    (df_model['tenure_days'] / 30 + 1)
)

df_model['payment_health'] = (
    df_model['avg_payment_value'] /
    (df_model['dunning_count'] + 1) /
    (df_model['avg_days_late'].fillna(0) + 1)
).clip(upper=1e6)

df_model['ever_dunning'] = (df_model['dunning_count'] > 0).astype(int)

df_model['late_payment_rate'] = (
    df_model['late_payment_count'] /
    (df_model['payment_count'] + 1)
)

df_model['support_intensity'] = (
    df_model['ticket_count'] /
    (df_model['tenure_days'] / 30 + 1)
)

df_model['has_open_critical'] = (
    (df_model['critical_tickets'] > 0) &
    (df_model['open_ticket_ratio'] > 0)
).astype(int)

df_model['unresolved_rate'] = (
    df_model['open_tickets'] /
    (df_model['ticket_count'] + 1)
)

df_model['nps_usage_interaction'] = (
    df_model['nps_latest'] * df_model['monthly_usage_hrs']
)

df_model['nps_tenure_interaction'] = (
    df_model['nps_latest'] * df_model['tenure_days']
)

df_model['login_recency_ratio'] = (
    df_model['days_since_login'] /
    (df_model['tenure_days'] + 1)
)

df_model['revenue_per_day'] = (
    df_model['total_billed'] /
    (df_model['tenure_days'] + 1)
)

# Fix inf/nan
for col in df_model.select_dtypes(include=[np.number]).columns:
    df_model[col] = df_model[col].replace([np.inf, -np.inf], np.nan)
    if df_model[col].isna().sum() > 0:
        df_model[col] = df_model[col].fillna(df_model[col].median())

print(f"Shape after FE: {df_model.shape}")

# ── Encoding ──
label_encoders = {}
for col in ['plan_type', 'contract_type']:
    le = LabelEncoder()
    df_model[col] = le.fit_transform(df_model[col].astype(str))
    label_encoders[col] = le
    print(f"  {col}: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# ── Split ──
X = df_model.drop(columns=['churn'])
y = df_model['churn']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTrain: {X_train.shape} | Churn: {y_train.mean():.2%}")
print(f"Test:  {X_test.shape}  | Churn: {y_test.mean():.2%}")
print(f"Features: {X_train.shape[1]}")

# ── RandomizedSearchCV ──
print("\nTraining Random Forest with RandomizedSearchCV...")
print("(30 iterations x 5-fold CV — ini bisa 5-10 menit)")

param_dist = {
    'n_estimators': [100, 200, 300, 500],
    'max_depth': [None, 10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'max_features': ['sqrt', 'log2'],
}

search = RandomizedSearchCV(
    estimator=RandomForestClassifier(random_state=42, n_jobs=-1),
    param_distributions=param_dist,
    n_iter=30, cv=5, scoring='roc_auc',
    random_state=42, n_jobs=-1, verbose=1
)
search.fit(X_train, y_train)

model = search.best_estimator_
print(f"\nBest Params: {search.best_params_}")
print(f"CV AUC: {search.best_score_:.4f}")

# ── Evaluate ──
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

train_auc = roc_auc_score(y_train, model.predict_proba(X_train)[:, 1])
test_auc = roc_auc_score(y_test, y_prob)
gap = train_auc - test_auc

print(f"\n{'='*50}")
print(f"EVALUATION RESULTS")
print(f"{'='*50}")
print(classification_report(y_test, y_pred, target_names=['Active', 'Churn']))
print(f"Train AUC: {train_auc:.4f}")
print(f"Test AUC:  {test_auc:.4f}")
print(f"Gap:       {gap:.4f} {'✅' if gap < 0.05 else '⚠️'}")
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"F1:        {f1_score(y_test, y_pred):.4f}")

# ── Save ──
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(model, MODEL_PATH)
joblib.dump(label_encoders, ENCODER_PATH)
joblib.dump(list(X_train.columns), FEATURES_PATH)

print(f"\n✅ Model saved: {MODEL_PATH}")
print(f"✅ Encoders saved: {ENCODER_PATH}")
print(f"✅ Feature names saved: {FEATURES_PATH}")
print(f"\nTop 10 Feature Importance:")
imp = pd.Series(model.feature_importances_, index=X_train.columns)
imp = imp.sort_values(ascending=False)
for i, (feat, val) in enumerate(imp.head(10).items(), 1):
    print(f"  {i:>2}. {feat:<30} {val:.4f}")
