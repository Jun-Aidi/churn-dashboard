from flask import Flask
from flask_cors import CORS

from config import DEBUG, CORS_ORIGINS, MAX_CONTENT_LENGTH


def create_app():
    app = Flask(__name__)

    # Batasi ukuran body request (lindungi upload/payload besar).
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    # CORS:
    # - Pola B (reverse proxy, same-origin): frontend & backend di domain yang sama,
    #   browser tidak memicu CORS sama sekali — jadi tidak perlu diaktifkan di produksi.
    # - Development: Vite (localhost:5173) memanggil backend (localhost:5000) = beda port
    #   = cross-origin, sehingga CORS perlu diizinkan untuk origin dev saja.
    if DEBUG and CORS_ORIGINS:
        CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

    # Initialize database (non-blocking — falls back to CSV if MySQL unavailable)
    from app.database import init_db
    init_db()

    # Initialize RAG engine (non-blocking)
    from app.nlp.rag_engine import init_rag
    init_rag()

    # Initialize LLM client (non-blocking)
    from app.nlp.llm_client import init_llm
    init_llm()

    # Register blueprints
    from app.routes import chat_bp, customers_bp, predict_bp, trend_bp, upload_bp
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(customers_bp, url_prefix='/api')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(trend_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')

    # Register auth blueprint
    from app.routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    return app
