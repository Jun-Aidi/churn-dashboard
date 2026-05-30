"""
Flask Routes — API endpoints.
"""

from flask import Blueprint, request, jsonify
from app.nlp.chat_engine import process_chat
from app.services.customer_service import CustomerService
from app.services.predict_service import predict_single

chat_bp = Blueprint('chat', __name__)
customers_bp = Blueprint('customers', __name__)
predict_bp = Blueprint('predict', __name__)
trend_bp = Blueprint('trend', __name__)
upload_bp = Blueprint('upload', __name__)


# ══════════════════════════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════════════════════════

@chat_bp.route('/chat', methods=['POST'])
def chat():
    """Main chatbot endpoint — LLM + RAG powered."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Field "message" diperlukan'}), 400

    message = data['message']
    session_id = data.get('session_id', None)

    result = process_chat(message, session_id)

    return jsonify({
        'response': result['response'],
        'source': result.get('source', 'unknown'),
        'tokens_used': result.get('tokens_used', 0),
    })


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOMERS
# ══════════════════════════════════════════════════════════════════════════════

@customers_bp.route('/customers', methods=['GET'])
def get_customers():
    """Get all customers with risk scores."""
    service = CustomerService()
    customers = service.get_all_customers()
    return jsonify(customers)


@customers_bp.route('/customers/<customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Get single customer detail."""
    service = CustomerService()
    customer = service.get_customer(customer_id.upper())
    if not customer:
        return jsonify({'error': 'Pelanggan tidak ditemukan'}), 404
    return jsonify(customer)


@customers_bp.route('/customers/stats', methods=['GET'])
def get_stats():
    """Customer summary statistics."""
    service = CustomerService()
    stats = service.get_stats()
    return jsonify(stats)


# ══════════════════════════════════════════════════════════════════════════════
# PREDICT
# ══════════════════════════════════════════════════════════════════════════════

@predict_bp.route('/predict', methods=['POST'])
def predict():
    """Predict churn for manual input."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data diperlukan'}), 400
    result = predict_single(data)
    return jsonify(result)


# ══════════════════════════════════════════════════════════════════════════════
# TREND
# ══════════════════════════════════════════════════════════════════════════════

@trend_bp.route('/trend', methods=['GET'])
def get_trend():
    """Trend data — risk distribution per month."""
    service = CustomerService()
    trend = service.get_trend_data()
    return jsonify(trend)


# ══════════════════════════════════════════════════════════════════════════════
# UPLOAD CSV
# ══════════════════════════════════════════════════════════════════════════════

@upload_bp.route('/upload', methods=['POST'])
def upload_csv():
    """
    Upload CSV data.
    Supports merged CSV (single file with all features) or raw CSVs (multiple files to merge).
    """
    import pandas as pd
    import numpy as np
    from app.database import get_session, close_session, Customer
    from app.services.customer_service import _predict_dataframe

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files are supported'}), 400

    try:
        df = pd.read_csv(file)

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
                inserted = 0
                updated = 0
                for _, row in df.iterrows():
                    existing = session.query(Customer).filter_by(
                        customer_id=row['customer_id']
                    ).first()

                    col_mapping = {
                        'plan_type', 'contract_type', 'tenure_days',
                        'monthly_usage_hrs', 'feature_adoption_pct',
                        'days_since_login', 'total_users', 'nps_latest',
                        'ticket_count', 'critical_tickets', 'open_tickets',
                        'total_billed', 'avg_payment_value', 'late_payment_count',
                        'dunning_count', 'avg_days_late', 'payment_count',
                        'risk_score', 'risk_class',
                    }

                    if existing:
                        for col in col_mapping:
                            if col in row.index and pd.notna(row[col]):
                                setattr(existing, col, row[col])
                        updated += 1
                    else:
                        customer = Customer(
                            customer_id=row['customer_id'],
                            **{col: row.get(col) for col in col_mapping if col in row.index and pd.notna(row.get(col, None))}
                        )
                        session.add(customer)
                        inserted += 1

                session.commit()
                close_session(session)

                return jsonify({
                    'success': True,
                    'message': f'Upload berhasil: {inserted} baru, {updated} diperbarui',
                    'total_rows': len(df),
                    'inserted': inserted,
                    'updated': updated,
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
