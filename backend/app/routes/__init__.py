"""Routes package — re-exports all blueprints."""

from app.routes.main_routes import (
    chat_bp,
    customers_bp,
    predict_bp,
    trend_bp,
    upload_bp,
)
from app.routes.auth_routes import auth_bp

__all__ = [
    "chat_bp",
    "customers_bp",
    "predict_bp",
    "trend_bp",
    "upload_bp",
    "auth_bp",
]
