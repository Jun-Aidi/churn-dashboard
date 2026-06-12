"""
Customer Service — Data access layer.
Reads from MySQL if available, falls back to CSV.
Uses churn_model_bundle.pkl for predictions.
"""

import os
import numpy as np
import pandas as pd
import joblib
from typing import Optional, List, Dict
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import config
from app.database import get_session, close_session, Customer
from app.services.customer_cache import customer_data_cache

# ── Load Model Bundle ──
_bundle = joblib.load(config.MODEL_PATH)
_model = _bundle['model']
_label_encoders = _bundle['label_encoders']
_threshold = _bundle['threshold']
_feature_columns = _bundle['feature_columns']


def get_risk_class(score: float) -> dict:
    """Classify risk based on churn probability (0-100)."""
    if score >= 66:
        return {'cls': 'high', 'label': 'Risiko Tinggi', 'color': '#e03d3d'}
    if score >= 31:
        return {'cls': 'med', 'label': 'Risiko Sedang', 'color': '#d4a017'}
    return {'cls': 'low', 'label': 'Risiko Rendah', 'color': '#2da44e'}


def _feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """Apply feature engineering (same as training)."""
    df = df.copy()

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

    # Calculate open_ticket_ratio if not present
    if 'open_ticket_ratio' not in df.columns:
        df['open_ticket_ratio'] = df['open_tickets'] / (df['ticket_count'] + 1)

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
            df[col] = df[col].fillna(df[col].median() if len(df) > 1 else 0)

    return df


def _predict_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Run prediction on a DataFrame, return with risk_score and risk_class."""
    df_model = df.copy()

    # Drop non-feature columns
    drop_cols = [
        'customer_id', 'unsubscribed_date', 'subscription_date',
        'effective_start', 'first_billing_date', 'last_billing_date',
        'last_payment_date', 'last_survey_date', 'last_ticket_date',
        'risk_score', 'risk_class', 'risk_label', 'uploaded_at', 'id',
    ]
    df_model = df_model.drop(columns=[c for c in drop_cols if c in df_model.columns], errors='ignore')

    # Feature engineering
    df_model = _feature_engineering(df_model)

    # Encode categorical
    for col, le in _label_encoders.items():
        if col in df_model.columns:
            df_model[col] = df_model[col].astype(str).apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else -1
            )

    # Drop target if present
    if 'churn' in df_model.columns:
        df_model = df_model.drop(columns=['churn'])

    # Ensure all feature columns exist
    for col in _feature_columns:
        if col not in df_model.columns:
            df_model[col] = 0

    df_model = df_model[_feature_columns]

    # Predict
    probabilities = _model.predict_proba(df_model)[:, 1]
    df['risk_score'] = (probabilities * 100).round(1)
    df['risk_class'] = df['risk_score'].apply(lambda s: get_risk_class(s)['cls'])

    return df


class CustomerService:
    """Service layer for customer data access and churn prediction."""

    def __init__(self, user_id=None):
        self._use_db = False
        self.df = None
        self._user_id = user_id
        self._load_data()

    def _load_data(self):
        """Load data from MySQL only. No automatic CSV fallback.

        Uses a short-TTL per-user cache so multiple endpoints hit within the
        same page load (e.g. /customers, /trend, /customers/stats) share a
        single DB query + DataFrame build instead of repeating the full load.
        """
        # Try the per-user cache first.
        if self._user_id is not None:
            cached = customer_data_cache.get(self._user_id)
            if cached is not None:
                self._use_db = True
                self.df = cached
                return

        session = get_session()
        if session:
            try:
                query = session.query(Customer)
                if self._user_id is not None:
                    query = query.filter_by(user_id=self._user_id)
                customers = query.all()
                if customers:
                    self._use_db = True
                    cols = [col.name for col in Customer.__table__.columns]
                    rows = [
                        {col: getattr(c, col) for col in cols}
                        for c in customers
                    ]
                    self.df = pd.DataFrame(rows)
                    # Safety net only: if some rows have no risk_score yet
                    # (e.g. legacy data), predict ONLY those rows in memory.
                    # GET must never write back to the DB — scoring happens at
                    # insert (add_customer) and upload time.
                    needs_pred = self.df['risk_score'].isna()
                    if needs_pred.any():
                        predicted = _predict_dataframe(self.df[needs_pred].copy())
                        self.df.loc[needs_pred, 'risk_score'] = predicted['risk_score'].values
                        self.df.loc[needs_pred, 'risk_class'] = predicted['risk_class'].values
                    if self._user_id is not None:
                        customer_data_cache.set(self._user_id, self.df)
                    return
            except Exception as e:
                print(f"[CustomerService] DB read failed: {e}")
            finally:
                close_session(session)

        # No CSV fallback - database must be populated via /api/upload endpoint
        self.df = pd.DataFrame()
        print("[CustomerService] No data in database. Upload CSV via /api/upload to populate data.")

    def _customer_to_dict(self, row: pd.Series) -> dict:
        """Convert a DataFrame row to API response dict."""
        tenure_days = row.get('tenure_days', 0) or 0
        total_billed = row.get('total_billed', 0) or 0
        
        tenure_months = round(tenure_days / 30, 1)
        monthly_rev = total_billed / max(tenure_days / 30, 1)

        return {
            'customer_id': row.get('customer_id', '') or '',
            'plan_type': row.get('plan_type', '') or '',
            'contract_type': row.get('contract_type', '') or '',
            'tenure_days': int(tenure_days),
            'tenure_months': tenure_months,
            'monthly_usage_hrs': float(row.get('monthly_usage_hrs', 0) or 0),
            'feature_adoption_pct': float(row.get('feature_adoption_pct', 0) or 0),
            'days_since_login': int(row.get('days_since_login', 0) or 0),
            'last_login_days_ago': int(row.get('days_since_login', 0) or 0),
            'total_users': int(row.get('total_users', 0) or 0),
            'nps_score': float(row.get('nps_latest', 0) or 0),
            'nps_latest': float(row.get('nps_latest', 0) or 0),
            'ticket_count': int(row.get('ticket_count', 0) or 0),
            'support_tickets_last_90d': int(row.get('ticket_count', 0) or 0),
            'critical_tickets': int(row.get('critical_tickets', 0) or 0),
            'open_tickets': int(row.get('open_tickets', 0) or 0),
            'total_billed': float(total_billed),
            'monthly_revenue': round(monthly_rev, 2),
            'avg_payment_value': float(row.get('avg_payment_value', 0) or 0),
            'dunning_count': int(row.get('dunning_count', 0) or 0),
            'late_payment_count': int(row.get('late_payment_count', 0) or 0),
            'payment_delay_count': int(row.get('late_payment_count', 0) or 0),
            'risk_score': float(row.get('risk_score', 0) or 0),
            'risk_class': row.get('risk_class', 'low') or 'low',
            'risk_label': get_risk_class(float(row.get('risk_score', 0) or 0))['label'],
        }

    def get_all_customers(self) -> List[dict]:
        """Get all customers with risk scores."""
        if self.df is None or self.df.empty:
            return []
        # to_dict('records') is much faster than iterrows() for row->dict.
        return [self._customer_to_dict(rec) for rec in self.df.to_dict('records')]

    def get_customers_paginated(self, page: int = 1, per_page: int = 50,
                                risk_filter: Optional[str] = None) -> dict:
        """Return a single page of customers, optionally filtered by risk_class.

        Note: per-category counts for tabs should come from get_stats() (full
        dataset), not from a single page.
        """
        if self.df is None or self.df.empty:
            return {'customers': [], 'total': 0, 'page': page,
                    'per_page': per_page, 'pages': 0}

        df = self.df if not risk_filter else self.df[self.df['risk_class'] == risk_filter]
        total = len(df)
        page = max(1, page)
        start = (page - 1) * per_page
        end = start + per_page
        rows = df.iloc[start:end]
        return {
            'customers': [self._customer_to_dict(rec) for rec in rows.to_dict('records')],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page if per_page else 0,
        }

    def get_customer(self, customer_id: str) -> Optional[dict]:
        """Get a single customer by ID."""
        if self.df is None or self.df.empty:
            return None
        mask = self.df['customer_id'].str.upper() == customer_id.upper()
        matches = self.df[mask]
        if matches.empty:
            return None
        return self._customer_to_dict(matches.iloc[0])

    def get_high_risk_customers(self) -> List[dict]:
        """Get high-risk customers sorted by score."""
        if self.df is None or self.df.empty:
            return []
        high_risk_df = self.df[self.df['risk_class'] == 'high']
        high = high_risk_df.sort_values(by='risk_score', ascending=False)  # type: ignore[call-overload]
        return [self._customer_to_dict(row) for _, row in high.iterrows()]

    def get_stats(self) -> dict:
        """Summary statistics."""
        if self.df is None or self.df.empty:
            return {'total': 0, 'high_risk': 0, 'med_risk': 0, 'low_risk': 0}

        total = len(self.df)
        high_risk = int((self.df['risk_class'] == 'high').sum())
        med_risk = int((self.df['risk_class'] == 'med').sum())
        low_risk = int((self.df['risk_class'] == 'low').sum())

        # Revenue (computed without mutating the cached DataFrame)
        monthly_rev = self.df['total_billed'] / (self.df['tenure_days'] / 30).clip(lower=1)
        total_revenue = float(monthly_rev.sum())
        revenue_at_risk = float(monthly_rev[self.df['risk_class'] == 'high'].sum())

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
        """Generate trend data (simulated from current distribution)."""
        import random
        random.seed(42)

        if self.df is None or self.df.empty:
            return []

        high_base = int((self.df['risk_class'] == 'high').sum())
        med_base = int((self.df['risk_class'] == 'med').sum())
        low_base = int((self.df['risk_class'] == 'low').sum())

        months = ['Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei']
        trend = []
        for i, month in enumerate(months):
            factor = 1 + (i - 3) * 0.03
            h = int(high_base * (factor + random.uniform(-0.05, 0.05)))
            m = int(med_base * (1 + random.uniform(-0.08, 0.08)))
            l = int(low_base * (1 / factor + random.uniform(-0.05, 0.05)))
            trend.append({'month': month, 'high': h, 'med': m, 'low': l})
        return trend

    def get_segment_stats(self) -> dict:
        """Churn stats per segment."""
        if self.df is None or self.df.empty:
            return {'plans': {}, 'contracts': {}}

        plans = {}
        for plan in ['starter', 'professional', 'enterprise']:
            subset = self.df[self.df['plan_type'].str.lower() == plan]
            if subset.empty:
                plans[plan.capitalize()] = {'total': 0, 'high_risk': 0, 'rate': 0.0}
            else:
                hr = int((subset['risk_class'] == 'high').sum())
                plans[plan.capitalize()] = {
                    'total': len(subset), 'high_risk': hr,
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
                    'total': len(subset), 'high_risk': hr,
                    'rate': hr / len(subset) * 100,
                }

        return {'plans': plans, 'contracts': contracts}

    def add_customer(self, data: dict) -> dict:
        """
        Add a single customer (manual entry) for the current user.

        `data` is a dict of raw feature values (same columns as the merged
        dataset). Runs prediction to compute risk_score/risk_class and inserts
        a Customer row scoped to self._user_id.

        Returns the saved customer as an API dict.
        Raises ValueError on validation/duplicate errors.
        """
        if self._user_id is None:
            raise ValueError("user_id diperlukan untuk menambah pelanggan")

        customer_id = str(data.get('customer_id', '')).strip().upper()
        if not customer_id:
            raise ValueError("customer_id wajib diisi")

        session = get_session()
        if session is None:
            raise ValueError("Database tidak tersedia")

        try:
            # Reject duplicate (same customer_id for this user)
            existing = session.query(Customer).filter_by(
                user_id=self._user_id, customer_id=customer_id
            ).first()
            if existing is not None:
                raise ValueError(f"Pelanggan {customer_id} sudah ada di data Anda")

            # Build a 1-row DataFrame and run prediction
            row = dict(data)
            row['customer_id'] = customer_id

            # Ensure all base columns referenced by feature engineering exist,
            # so manual entry with a partial set of fields doesn't break prediction.
            base_defaults = {
                'plan_type': 'starter', 'contract_type': 'monthly',
                'tenure_days': 0, 'monthly_usage_hrs': 0, 'feature_adoption_pct': 0,
                'days_since_login': 0, 'total_users': 1, 'nps_latest': 0,
                'ticket_count': 0, 'critical_tickets': 0, 'open_tickets': 0,
                'total_billed': 0, 'avg_payment_value': 0, 'late_payment_count': 0,
                'dunning_count': 0, 'avg_days_late': 0, 'payment_count': 0,
            }
            for col, default in base_defaults.items():
                if col not in row or row[col] is None or row[col] == '':
                    row[col] = default

            df = pd.DataFrame([row])
            df = _predict_dataframe(df)
            predicted = df.iloc[0]

            # Map only the columns that exist on the Customer table
            valid_cols = {c.name for c in Customer.__table__.columns}
            customer_data = {'customer_id': customer_id, 'user_id': self._user_id}
            for col in valid_cols:
                if col in ('id', 'customer_id', 'user_id', 'uploaded_at'):
                    continue
                if col in predicted.index:
                    val = predicted.get(col)
                    if val is not None and hasattr(val, 'item'):
                        val = val.item()
                    try:
                        if val is not None and not (isinstance(val, float) and np.isnan(val)):
                            customer_data[col] = val
                    except (TypeError, ValueError):
                        if val is not None:
                            customer_data[col] = val

            customer = Customer(**customer_data)
            session.add(customer)
            session.commit()

            # New row added — drop this user's cached DataFrame so subsequent
            # reads reflect the change immediately.
            customer_data_cache.invalidate(self._user_id)

            saved = {col.name: getattr(customer, col.name) for col in Customer.__table__.columns}
            return self._customer_to_dict(pd.Series(saved))
        except ValueError:
            session.rollback()
            raise
        except Exception as e:
            session.rollback()
            raise ValueError(f"Gagal menyimpan pelanggan: {str(e)}")
        finally:
            close_session(session)
