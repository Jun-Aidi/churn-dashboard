from flask import Blueprint, request, jsonify
from app.nlp.chat_engine import process_chat
from app.services.customer_service import CustomerService
from app.services.predict_service import predict_single

chat_bp = Blueprint('chat', __name__)
customers_bp = Blueprint('customers', __name__)
predict_bp = Blueprint('predict', __name__)
trend_bp = Blueprint('trend', __name__)


@chat_bp.route('/chat', methods=['POST'])
def chat():
    """Endpoint utama chatbot NLP."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Field "message" diperlukan'}), 400

    message = data['message']
    response = process_chat(message)
    return jsonify({'response': response})


@customers_bp.route('/customers', methods=['GET'])
def get_customers():
    """Ambil semua data pelanggan dengan skor risiko."""
    service = CustomerService()
    customers = service.get_all_customers()
    return jsonify(customers)


@customers_bp.route('/customers/<customer_id>', methods=['GET'])
def get_customer(customer_id):
    """Ambil detail satu pelanggan."""
    service = CustomerService()
    customer = service.get_customer(customer_id.upper())
    if not customer:
        return jsonify({'error': 'Pelanggan tidak ditemukan'}), 404
    return jsonify(customer)


@customers_bp.route('/customers/stats', methods=['GET'])
def get_stats():
    """Statistik ringkasan pelanggan."""
    service = CustomerService()
    stats = service.get_stats()
    return jsonify(stats)


@predict_bp.route('/predict', methods=['POST'])
def predict():
    """Prediksi churn untuk input manual."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Data diperlukan'}), 400

    result = predict_single(data)
    return jsonify(result)


@trend_bp.route('/trend', methods=['GET'])
def get_trend():
    """Trend data churn — distribusi risiko per bulan (simulasi dari data)."""
    service = CustomerService()
    trend = service.get_trend_data()
    return jsonify(trend)
