"""
Customer Service — Data access layer.
Membaca data pelanggan dari CSV dan menghitung skor risiko.
Nanti bisa diganti dengan database connection.
"""

import os
import pandas as pd
from typing import Optional, List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'customers.csv')


def calc_risk_score(row) -> int:
    """Hitung skor risiko churn (0-100) berdasarkan rule-based scoring."""
    score = 0

    # Last login
    if row['last_login_days_ago'] > 60:
        score += 30
    elif row['last_login_days_ago'] > 30:
        score += 18
    elif row['last_login_days_ago'] > 14:
        score += 8

    # Support tickets
    if row['support_tickets_last_90d'] >= 10:
        score += 25
    elif row['support_tickets_last_90d'] >= 5:
        score += 15
    elif row['support_tickets_last_90d'] >= 2:
        score += 7

    # Feature adoption
    if row['feature_adoption_pct'] < 30:
        score += 20
    elif row['feature_adoption_pct'] < 50:
        score += 12
    elif row['feature_adoption_pct'] < 65:
        score += 6

    # Contract type
    if row['contract_type'] == 'Monthly':
        score += 8

    # Tenure
    if row['tenure_months'] < 15:
        score += 10
    elif row['tenure_months'] < 25:
        score += 5

    # Usage
    if row['monthly_usage_hrs'] < 10:
        score += 12
    elif row['monthly_usage_hrs'] < 20:
        score += 6

    # Payment delays
    if row['payment_delay_count'] >= 3:
        score += 8
    elif row['payment_delay_count'] >= 1:
        score += 4

    # NPS
    if row['nps_score'] <= 2:
        score += 6

    return min(100, score)


def get_risk_class(score: int) -> dict:
    """Klasifikasi risiko berdasarkan skor."""
    if score >= 66:
        return {'cls': 'high', 'label': 'Risiko Tinggi', 'color': '#e03d3d'}
    if score >= 31:
        return {'cls': 'med', 'label': 'Risiko Sedang', 'color': '#d4a017'}
    return {'cls': 'low', 'label': 'Risiko Rendah', 'color': '#2da44e'}


class CustomerService:
    """Service untuk akses data pelanggan."""

    def __init__(self):
        self._df = self._load_data()

    def _load_data(self) -> pd.DataFrame:
        """Load CSV dan hitung risk score."""
        if not os.path.exists(DATA_PATH):
            # Return empty DataFrame jika file belum ada
            return pd.DataFrame()

        df = pd.read_csv(DATA_PATH)
        df['risk_score'] = df.apply(calc_risk_score, axis=1)
        risk_info = df['risk_score'].apply(get_risk_class)
        df['risk_class'] = risk_info.apply(lambda x: x['cls'])
        df['risk_label'] = risk_info.apply(lambda x: x['label'])
        return df

    def get_all_customers(self) -> List[dict]:
        """Ambil semua pelanggan sebagai list of dict."""
        if self._df.empty:
            return []
        return self._df.to_dict('records')

    def get_customer(self, customer_id: str) -> Optional[dict]:
        """Ambil satu pelanggan berdasarkan ID."""
        if self._df.empty:
            return None
        match = self._df[self._df['customer_id'] == customer_id]
        if match.empty:
            return None
        return match.iloc[0].to_dict()

    def get_high_risk_customers(self) -> List[dict]:
        """Ambil pelanggan risiko tinggi, sorted by revenue desc."""
        if self._df.empty:
            return []
        high = self._df[self._df['risk_class'] == 'high'].copy()
        high = high.sort_values('monthly_revenue', ascending=False)
        return high.to_dict('records')

    def get_stats(self) -> dict:
        """Statistik ringkasan."""
        if self._df.empty:
            return {
                'total': 0, 'high_risk': 0, 'med_risk': 0, 'low_risk': 0,
                'high_risk_pct': 0, 'med_risk_pct': 0, 'low_risk_pct': 0,
                'revenue_at_risk': 0, 'total_revenue': 0, 'avg_score': 0,
                'inactive_30d': 0, 'high_tickets': 0, 'high_adoption': 0,
            }

        total = len(self._df)
        high = len(self._df[self._df['risk_class'] == 'high'])
        med = len(self._df[self._df['risk_class'] == 'med'])
        low = len(self._df[self._df['risk_class'] == 'low'])

        return {
            'total': total,
            'high_risk': high,
            'med_risk': med,
            'low_risk': low,
            'high_risk_pct': (high / total * 100) if total else 0,
            'med_risk_pct': (med / total * 100) if total else 0,
            'low_risk_pct': (low / total * 100) if total else 0,
            'revenue_at_risk': float(
                self._df[self._df['risk_class'] == 'high']['monthly_revenue'].sum()),
            'total_revenue': float(self._df['monthly_revenue'].sum()),
            'avg_score': float(self._df['risk_score'].mean()),
            'inactive_30d': int(
                (self._df['last_login_days_ago'] > 30).sum()),
            'high_tickets': int(
                (self._df['support_tickets_last_90d'] >= 10).sum()),
            'high_adoption': int(
                (self._df['feature_adoption_pct'] > 70).sum()),
        }

    def get_segment_stats(self) -> dict:
        """Statistik per segmen."""
        if self._df.empty:
            return {'plans': {}, 'contracts': {}}

        plans = {}
        for plan in ['Starter', 'Professional', 'Enterprise']:
            subset = self._df[self._df['plan_type'] == plan]
            t = len(subset)
            hr = len(subset[subset['risk_class'] == 'high'])
            plans[plan] = {
                'total': t,
                'high_risk': hr,
                'rate': (hr / t * 100) if t else 0,
            }

        contracts = {}
        for ct in ['Monthly', 'Annual']:
            subset = self._df[self._df['contract_type'] == ct]
            t = len(subset)
            hr = len(subset[subset['risk_class'] == 'high'])
            contracts[ct] = {
                'total': t,
                'high_risk': hr,
                'rate': (hr / t * 100) if t else 0,
            }

        return {'plans': plans, 'contracts': contracts}
