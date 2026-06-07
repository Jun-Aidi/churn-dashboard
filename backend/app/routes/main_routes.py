"""
Flask Routes — API endpoints.
"""

from flask import Blueprint, request, jsonify, g
from app.nlp.chat_engine import process_chat
from app.services.customer_service import CustomerService
from app.services.predict_service import predict_single, get_feature_importance
from app.middleware.auth import auth_required

chat_bp = Blueprint('chat', __name__)
customers_bp = Blueprint('customers', __name__)
predict_bp = Blueprint('predict', __name__)
trend_bp = Blueprint('trend', __name__)
upload_bp = Blueprint('upload', __name__)


# ══════════════════════════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════════════════════════

@chat_bp.route('/chat', methods=['POST'])
@auth_required
def chat():
    """Main chatbot endpoint — LLM + RAG powered."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Field "message" diperlukan'}), 400

    message = data['message']
    session_id = data.get('session_id', None)

    # Scope chatbot answers to the logged-in user's own dashboard data
    result = process_chat(message, session_id, user_id=g.current_user.id)

    return jsonify({
        'response': result['response'],
        'source': result.get('source', 'unknown'),
        'tokens_used': result.get('tokens_used', 0),
    })


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMERS
# ══════════════════════════════════════════════════════════════════════════════

@customers_bp.route('/customers', methods=['GET'])
@auth_required
def get_customers():
    """Get all customers with risk scores (filtered by current user)."""
    service = CustomerService(user_id=g.current_user.id)
    customers = service.get_all_customers()
    return jsonify(customers)


@customers_bp.route('/customers/<customer_id>', methods=['GET'])
@auth_required
def get_customer(customer_id):
    """Get single customer detail (filtered by current user)."""
    service = CustomerService(user_id=g.current_user.id)
    customer = service.get_customer(customer_id.upper())
    if not customer:
        return jsonify({'error': 'Pelanggan tidak ditemukan'}), 404
    return jsonify(customer)


@customers_bp.route('/customers/stats', methods=['GET'])
@auth_required
def get_stats():
    """Customer summary statistics (filtered by current user)."""
    service = CustomerService(user_id=g.current_user.id)
    stats = service.get_stats()
    return jsonify(stats)


@customers_bp.route('/customers', methods=['POST'])
@auth_required
def add_customer():
    """Manually add a single customer (all feature values) for the current user."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data diperlukan'}), 400

    service = CustomerService(user_id=g.current_user.id)
    try:
        saved = service.add_customer(data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    return jsonify({'success': True, 'customer': saved}), 201


# ══════════════════════════════════════════════════════════════════════════════
# PREDICT
# ══════════════════════════════════════════════════════════════════════════════

@predict_bp.route('/predict', methods=['POST'])
@auth_required
def predict():
    """Predict churn for manual input."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data diperlukan'}), 400
    result = predict_single(data)
    return jsonify(result)


@predict_bp.route('/feature-importance', methods=['GET'])
@auth_required
def feature_importance():
    """Return the model's top global feature importances."""
    return jsonify(get_feature_importance(top_n=8))


# ══════════════════════════════════════════════════════════════════════════════
# TREND
# ══════════════════════════════════════════════════════════════════════════════

@trend_bp.route('/trend', methods=['GET'])
@auth_required
def get_trend():
    """Trend data — risk distribution per month (filtered by current user)."""
    service = CustomerService(user_id=g.current_user.id)
    trend = service.get_trend_data()
    return jsonify(trend)


# ══════════════════════════════════════════════════════════════════════════════
# UPLOAD CSV
# ══════════════════════════════════════════════════════════════════════════════

@upload_bp.route('/upload', methods=['POST'])
@auth_required
def upload_csv():
    """
    Upload CSV data.
    Supports merged CSV (single file with all features) or raw CSVs (multiple files to merge).
    Replaces only the current user's data on re-upload.
    """
    import pandas as pd
    import numpy as np
    from app.database import get_session, close_session, Customer
    from app.services.customer_service import _predict_dataframe

    current_user_id = g.current_user.id

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file or not file.filename or not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are supported'}), 400

    try:
        df = pd.read_csv(file.stream)

        # Detect if merged or raw
        merged_indicators = ['ticket_count', 'nps_latest', 'total_billed', 'tenure_days']
        is_merged = all(col in df.columns for col in merged_indicators)

        if not is_merged:
            return jsonify({
                'error': 'File CSV harus berformat merged (mengandung kolom: ticket_count, nps_latest, total_billed, tenure_days). '
                         'Upload file merged_dataset.csv atau file yang sudah di-merge.'
            }), 400

        if 'customer_id' not in df.columns:
            return jsonify({'error': 'Kolom customer_id tidak ditemukan'}), 400

        # Run predictions
        df = _predict_dataframe(df)

        # Try to save to DB
        session = get_session()
        if session:
            try:
                # Delete existing records for current user before inserting new ones
                session.query(Customer).filter_by(user_id=current_user_id).delete()

                inserted = 0
                for _, row in df.iterrows():
                    col_mapping = (
                        'plan_type', 'contract_type', 'tenure_days',
                        'monthly_usage_hrs', 'feature_adoption_pct',
                        'days_since_login', 'total_users', 'nps_latest',
                        'ticket_count', 'critical_tickets', 'open_tickets',
                        'total_billed', 'avg_payment_value', 'late_payment_count',
                        'dunning_count', 'avg_days_late', 'payment_count',
                        'risk_score', 'risk_class',
                    )

                    customer_data = {
                        'customer_id': row['customer_id'],
                        'user_id': current_user_id,
                    }
                    for col in col_mapping:
                        if col in row.index:
                            val = row.get(col)
                            # Convert to Python scalar to avoid pandas type issues
                            if val is not None and hasattr(val, 'item'):
                                val = val.item()
                            # Check if value is not NaN/None
                            try:
                                if val is not None and not (isinstance(val, float) and np.isnan(val)):
                                    customer_data[col] = val
                            except (TypeError, ValueError):
                                if val is not None:
                                    customer_data[col] = val
                    customer = Customer(**customer_data)
                    session.add(customer)
                    inserted += 1

                session.commit()
                close_session(session)

                return jsonify({
                    'success': True,
                    'message': f'Upload berhasil: {inserted} baru',
                    'total_rows': len(df),
                    'inserted': inserted,
                    'updated': 0,
                })
            except Exception as e:
                session.rollback()
                close_session(session)
                return jsonify({'error': f'Database error: {str(e)}'}), 500
        else:
            # No DB — just return prediction results
            return jsonify({
                'success': True,
                'message': f'Prediksi selesai untuk {len(df)} pelanggan (tanpa database)',
                'total_rows': len(df),
            })

    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500
