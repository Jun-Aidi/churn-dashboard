from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

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
