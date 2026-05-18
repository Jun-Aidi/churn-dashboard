"""
Customer Service — Data access layer.
Membaca data pelanggan dari CSV, prediksi churn menggunakan model .pkl.
"""

import os
import numpy as np
import pandas as pd
import joblib
from typing import Optional, List, Dict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'customers.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'churn_model.pkl')
ENCODER_PATH = os.path.join(BASE_DIR, 'models', 'label_encoders.pkl')
FEATURES_PATH = os.path.join(BASE_DIR, 'models', 'feature_names.pkl')


def get_risk_class(score: float) -> dict:
    """Klasifikasi risiko berdasarkan probabilitas churn (0-100)."""
    if score >= 66:
        return {'cls': 'high', 'label': 'Risiko Tinggi', 'color': '#e03d3d'}
    if score >= 31:
        return {'cls': 'med', 'label': 'Risiko Sedang', 'color': '#d4a017'}
    return {'cls': 'low', 'label': 'Risiko Rendah', 'color': '#2da44e'}


class CustomerService:
    """Service layer untuk akses data pelanggan dan prediksi churn."""

    def __init__(self):
        self.df = pd.read_csv(DATA_PATH)
        self.model = joblib.load(MODEL_PATH)
        self.label_encoders = joblib.load(ENCODER_PATH)
        self.feature_names = joblib.load(FEATURES_PATH)
        self._prepare_data()

    def _prepare_data(self):
        """Feature engineering + prediksi risiko untuk semua pelanggan."""
        df = self.df.copy()

        # ── Drop kolom leakage & non-feature (sama seperti training) ──
        drop_cols = [
            'customer_id', 'unsubscribed_date', 'subscription_date',
            'effective_start', 'first_billing_date', 'last_billing_date',
            'last_payment_date', 'last_survey_date', 'last_ticket_date',
        ]
        df_model = df.drop(columns=[c for c in drop_cols if c in df.columns])

        # ── Feature Engineering (harus SAMA dengan train_model.py) ──
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

        # ── Encoding (gunakan encoder dari training) ──
        for col, le in self.label_encoders.items():
            if col in df_model.columns:
                # Handle unseen labels gracefully
                df_model[col] = df_model[col].astype(str).apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else -1
                )

        # ── Drop target jika ada ──
        if 'churn' in df_model.columns:
            df_model = df_model.drop(columns=['churn'])

        # ── Pastikan kolom sesuai urutan training ──
        missing_cols = set(self.feature_names) - set(df_model.columns)
        for col in missing_cols:
            df_model[col] = 0

        df_model = df_model[self.feature_names]

        # ── Prediksi ──
        probabilities = self.model.predict_proba(df_model)[:, 1]
        self.df['risk_score'] = (probabilities * 100).round(1)
        self.df['risk_class'] = self.df['risk_score'].apply(
            lambda s: get_risk_class(s)['cls']
        )
        self.df['risk_label'] = self.df['risk_score'].apply(
            lambda s: get_risk_class(s)['label']
        )

    def _customer_to_dict(self, row: pd.Series) -> dict:
        """Konversi satu baris DataFrame ke dict untuk API response."""
        return {
            'customer_id': row['customer_id'],
            'plan_type': row['plan_type'],
            'contract_type': row['contract_type'],
            'tenure_days': int(row['tenure_days']),
            'tenure_months': round(row['tenure_days'] / 30, 1),
            'monthly_usage_hrs': float(row['monthly_usage_hrs']),
            'feature_adoption_pct': float(row['feature_adoption_pct']),
            'days_since_login': int(row['days_since_login']),
            'last_login_days_ago': int(row['days_since_login']),
            'total_users': int(row['total_users']),
            'nps_score': float(row['nps_latest']),
            'nps_latest': float(row['nps_latest']),
            'ticket_count': int(row['ticket_count']),
            'support_tickets_last_90d': int(row['ticket_count']),
            'total_billed': float(row['total_billed']),
            'monthly_revenue': round(row['total_billed'] / max(row['tenure_days'] / 30, 1), 2),
            'avg_payment_value': float(row['avg_payment_value']),
            'dunning_count': int(row['dunning_count']),
            'late_payment_count': int(row['late_payment_count']),
            'payment_delay_count': int(row['late_payment_count']),
            'critical_tickets': int(row.get('critical_tickets', 0)),
            'open_tickets': int(row.get('open_tickets', 0)),
            'risk_score': float(row['risk_score']),
            'risk_class': row['risk_class'],
            'risk_label': row['risk_label'],
        }

    def get_all_customers(self) -> List[dict]:
        """Ambil semua pelanggan dengan skor risiko."""
        return [self._customer_to_dict(row) for _, row in self.df.iterrows()]

    def get_customer(self, customer_id: str) -> Optional[dict]:
        """Ambil detail satu pelanggan berdasarkan ID."""
        # Case-insensitive match
        mask = self.df['customer_id'].str.upper() == customer_id.upper()
        matches = self.df[mask]
        if matches.empty:
            return None
        return self._customer_to_dict(matches.iloc[0])

    def get_high_risk_customers(self) -> List[dict]:
        """Ambil pelanggan risiko tinggi, diurutkan dari skor tertinggi."""
        high = self.df[self.df['risk_class'] == 'high'].sort_values(
            'risk_score', ascending=False
        )
        return [self._customer_to_dict(row) for _, row in high.iterrows()]

    def get_stats(self) -> dict:
        """Statistik ringkasan seluruh pelanggan."""
        total = len(self.df)
        high_risk = int((self.df['risk_class'] == 'high').sum())
        med_risk = int((self.df['risk_class'] == 'med').sum())
        low_risk = int((self.df['risk_class'] == 'low').sum())

        # Revenue calculation
        self.df['_monthly_rev'] = self.df['total_billed'] / (self.df['tenure_days'] / 30).clip(lower=1)
        total_revenue = float(self.df['_monthly_rev'].sum())
        revenue_at_risk = float(
            self.df[self.df['risk_class'] == 'high']['_monthly_rev'].sum()
        )

        # Additional stats
        inactive_30d = int((self.df['days_since_login'] > 30).sum())
        high_tickets = int((self.df['ticket_count'] >= 10).sum())
        high_adoption = int((self.df['feature_adoption_pct'] > 70).sum())
        avg_score = float(self.df['risk_score'].mean())

        return {
            'total': total,
            'high_risk': high_risk,
            'med_risk': med_risk,
            'low_risk': low_risk,
            'high_risk_pct': high_risk / total * 100 if total else 0,
            'med_risk_pct': med_risk / total * 100 if total else 0,
            'low_risk_pct': low_risk / total * 100 if total else 0,
            'total_revenue': total_revenue,
            'revenue_at_risk': revenue_at_risk,
            'avg_score': avg_score,
            'inactive_30d': inactive_30d,
            'high_tickets': high_tickets,
            'high_adoption': high_adoption,
        }

    def get_trend_data(self) -> list:
        """
        Generate trend data — distribusi risiko per bulan.
        Karena dataset tidak punya kolom tanggal churn per bulan,
        kita simulasi berdasarkan tenure_days (bagi ke bucket bulan).
        """
        import random
        random.seed(42)

        # Simulate 6 months of trend based on current risk distribution
        total = len(self.df)
        high_base = int((self.df['risk_class'] == 'high').sum())
        med_base = int((self.df['risk_class'] == 'med').sum())
        low_base = int((self.df['risk_class'] == 'low').sum())

        months = ['Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei']
        trend = []

        for i, month in enumerate(months):
            # Add some variance to simulate monthly changes
            factor = 1 + (i - 3) * 0.03  # slight upward trend
            h = int(high_base * (factor + random.uniform(-0.05, 0.05)))
            m = int(med_base * (1 + random.uniform(-0.08, 0.08)))
            l = int(low_base * (1 / factor + random.uniform(-0.05, 0.05)))
            trend.append({'month': month, 'high': h, 'med': m, 'low': l})

        return trend

    def get_segment_stats(self) -> dict:
        """Statistik churn per segmen (plan_type & contract_type)."""
        plans = {}
        for plan in ['starter', 'professional', 'enterprise']:
            subset = self.df[self.df['plan_type'].str.lower() == plan]
            if subset.empty:
                plans[plan.capitalize()] = {'total': 0, 'high_risk': 0, 'rate': 0.0}
            else:
                hr = int((subset['risk_class'] == 'high').sum())
                plans[plan.capitalize()] = {
                    'total': len(subset),
                    'high_risk': hr,
                    'rate': hr / len(subset) * 100,
                }

        contracts = {}
        for ct in ['monthly', 'annual']:
            subset = self.df[self.df['contract_type'].str.lower() == ct]
            if subset.empty:
                contracts[ct.capitalize()] = {'total': 0, 'high_risk': 0, 'rate': 0.0}
            else:
                hr = int((subset['risk_class'] == 'high').sum())
                contracts[ct.capitalize()] = {
                    'total': len(subset),
                    'high_risk': hr,
                    'rate': hr / len(subset) * 100,
                }

        return {'plans': plans, 'contracts': contracts}
