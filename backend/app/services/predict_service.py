"""
Predict Service — Single customer churn prediction from manual input.
"""

import os
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'churn_model.pkl')
ENCODER_PATH = os.path.join(BASE_DIR, 'models', 'label_encoders.pkl')
FEATURES_PATH = os.path.join(BASE_DIR, 'models', 'feature_names.pkl')

# Load model once at module level
_model = joblib.load(MODEL_PATH)
_encoders = joblib.load(ENCODER_PATH)
_feature_names = joblib.load(FEATURES_PATH)


def predict_single(data: dict) -> dict:
    """
    Prediksi churn dari input form manual.
    Input fields: total_users, tenure_months, monthly_usage_hrs, feature_adoption_pct,
                  days_since_last_login, total_tickets, high_priority_tickets,
                  avg_nps_score, total_payment_value, avg_payment_delay, total_delayed_payments
    """
    # Map form fields to model features
    tenure_days = data.get('tenure_months', 12) * 30
    monthly_usage_hrs = data.get('monthly_usage_hrs', 30)
    feature_adoption_pct = data.get('feature_adoption_pct', 50)
    days_since_login = data.get('days_since_last_login', 10)
    total_users = data.get('total_users', 1)
    ticket_count = data.get('total_tickets', 0)
    critical_tickets = data.get('high_priority_tickets', 0)
    nps_latest = data.get('avg_nps_score', 7)
    total_billed = data.get('total_payment_value', 1000000)
    avg_days_late = data.get('avg_payment_delay', 0)
    late_payment_count = data.get('total_delayed_payments', 0)

    # Defaults for fields not in form
    avg_payment_value = total_billed / max(tenure_days / 30, 1)
    dunning_count = 1 if late_payment_count > 2 else 0
    payment_count = max(int(tenure_days / 30), 1)
    open_tickets = max(0, int(ticket_count * 0.2))
    high_tickets = critical_tickets
    open_ticket_ratio = open_tickets / max(ticket_count, 1)
    critical_ticket_ratio = critical_tickets / max(ticket_count, 1)

    # Build a single-row DataFrame with raw features
    row = {
        'plan_type': 0,  # encoded starter
        'contract_type': 0,  # encoded monthly
        'total_users': total_users,
        'churn': 0,  # placeholder, will be dropped
        'tenure_days': tenure_days,
        'monthly_usage_hrs': monthly_usage_hrs,
        'feature_adoption_pct': feature_adoption_pct,
        'days_since_login': days_since_login,
        'total_billed': total_billed,
        'avg_payment_value': avg_payment_value,
        'total_transactions': payment_count,
        'dunning_count': dunning_count,
        'payment_count': payment_count,
        'avg_days_late': avg_days_late,
        'max_days_late': avg_days_late * 2,
        'late_payment_count': late_payment_count,
        'dunning_ratio': dunning_count / max(payment_count, 1),
        'days_since_last_payment': 15,
        'nps_latest': nps_latest,
        'nps_first': nps_latest,
        'nps_avg': nps_latest,
        'nps_min': nps_latest,
        'nps_count': 1,
        'nps_trend': 0,
        'days_since_survey': 30,
        'ticket_count': ticket_count,
        'critical_tickets': critical_tickets,
        'high_tickets': high_tickets,
        'billing_tickets': 0,
        'technical_tickets': max(0, ticket_count - critical_tickets),
        'feature_req_tickets': 0,
        'open_tickets': open_tickets,
        'resolved_tickets': max(0, ticket_count - open_tickets),
        'open_ticket_ratio': open_ticket_ratio,
        'critical_ticket_ratio': critical_ticket_ratio,
        'days_since_last_ticket': 30,
        'has_nps': 1,
        'date_corrected': 0,
    }

    df = pd.DataFrame([row])

    # Feature Engineering (same as training)
    df['engagement_score'] = (
        df['monthly_usage_hrs'] * df['feature_adoption_pct'] /
        (df['days_since_login'] + 1)
    ).clip(upper=1e6)

    df['usage_per_tenure'] = (
        df['monthly_usage_hrs'] / (df['tenure_days'] / 30 + 1)
    )

    df['payment_health'] = (
        df['avg_payment_value'] /
        (df['dunning_count'] + 1) /
        (df['avg_days_late'].fillna(0) + 1)
    ).clip(upper=1e6)

    df['ever_dunning'] = (df['dunning_count'] > 0).astype(int)

    df['late_payment_rate'] = (
        df['late_payment_count'] / (df['payment_count'] + 1)
    )

    df['support_intensity'] = (
        df['ticket_count'] / (df['tenure_days'] / 30 + 1)
    )

    df['has_open_critical'] = (
        (df['critical_tickets'] > 0) & (df['open_ticket_ratio'] > 0)
    ).astype(int)

    df['unresolved_rate'] = (
        df['open_tickets'] / (df['ticket_count'] + 1)
    )

    df['nps_usage_interaction'] = df['nps_latest'] * df['monthly_usage_hrs']
    df['nps_tenure_interaction'] = df['nps_latest'] * df['tenure_days']

    df['login_recency_ratio'] = (
        df['days_since_login'] / (df['tenure_days'] + 1)
    )

    df['revenue_per_day'] = (
        df['total_billed'] / (df['tenure_days'] + 1)
    )

    # Fix inf/nan
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)
        if df[col].isna().sum() > 0:
            df[col] = df[col].fillna(0)

    # Drop churn column
    if 'churn' in df.columns:
        df = df.drop(columns=['churn'])

    # Ensure all feature columns exist
    for col in _feature_names:
        if col not in df.columns:
            df[col] = 0

    df = df[_feature_names]

    # Predict
    prob = float(_model.predict_proba(df)[:, 1][0])
    score = round(prob * 100, 1)
    prediction = 1 if score >= 50 else 0

    # Risk level
    if score >= 66:
        level, label, color = 'high', 'Risiko Tinggi', '#e03d3d'
    elif score >= 31:
        level, label, color = 'med', 'Risiko Sedang', '#d4a017'
    else:
        level, label, color = 'low', 'Risiko Rendah', '#2da44e'

    # Top feature importances
    importances = _model.feature_importances_
    feat_imp = sorted(
        zip(_feature_names, importances),
        key=lambda x: x[1], reverse=True
    )[:5]

    feature_labels = {
        'days_since_login': 'Hari Sejak Login Terakhir',
        'engagement_score': 'Skor Engagement',
        'monthly_usage_hrs': 'Penggunaan Bulanan (jam)',
        'feature_adoption_pct': 'Adopsi Fitur (%)',
        'ticket_count': 'Total Tiket Support',
        'nps_latest': 'NPS Score',
        'avg_days_late': 'Keterlambatan Pembayaran',
        'late_payment_count': 'Jumlah Keterlambatan',
        'critical_tickets': 'Tiket Prioritas Tinggi',
        'total_billed': 'Total Billed',
        'tenure_days': 'Tenure (hari)',
        'payment_health': 'Kesehatan Pembayaran',
        'usage_per_tenure': 'Usage per Tenure',
        'support_intensity': 'Intensitas Support',
        'login_recency_ratio': 'Rasio Recency Login',
        'nps_usage_interaction': 'NPS × Usage',
        'nps_tenure_interaction': 'NPS × Tenure',
        'revenue_per_day': 'Revenue per Hari',
    }

    top_features = [
        {
            'name': name,
            'importance': float(imp),
            'label': feature_labels.get(name, name.replace('_', ' ').title()),
        }
        for name, imp in feat_imp
    ]

    # Engineered features for display
    high_priority_ratio = critical_tickets / max(ticket_count, 1)
    engagement = float(df['engagement_score'].iloc[0])
    payment_risk = avg_days_late * late_payment_count
    revenue_per_user = total_billed / max(total_users, 1)
    inactivity_ratio = days_since_login / max(tenure_days, 1)

    return {
        'churn_probability': prob,
        'churn_prediction': prediction,
        'risk': {'level': level, 'label': label, 'color': color},
        'top_features': top_features,
        'engineered': {
            'high_priority_ratio': high_priority_ratio,
            'engagement_score': engagement,
            'payment_risk_score': payment_risk,
            'revenue_per_user': revenue_per_user,
            'inactivity_ratio': inactivity_ratio,
        },
    }
