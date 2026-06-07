"""
Auth middleware decorators — JWT validation and role-based access control.
"""

from functools import wraps
from flask import request, g, jsonify

from app.utils.jwt_utils import decode_token
from app.database import get_session, close_session
from app.models.user import User


def auth_required(f):
    """Decorator that validates JWT from Authorization header and injects current_user into Flask g."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        # Extract token from "Bearer <token>" format
        if not auth_header.startswith('Bearer '):
            return jsonify({"error": "Token tidak valid atau sudah expired"}), 401

        token = auth_header[7:]  # Remove "Bearer " prefix

        if not token:
            return jsonify({"error": "Token tidak valid atau sudah expired"}), 401

        # Decode and validate token
        payload = decode_token(token)
        if payload is None:
            return jsonify({"error": "Token tidak valid atau sudah expired"}), 401

        # Fetch user from database to ensure they still exist and are active
        session = get_session()
        if session is None:
            return jsonify({"error": "Token tidak valid atau sudah expired"}), 401

        try:
            user = session.query(User).filter_by(id=payload.get('user_id')).first()

            if user is None or not user.is_active:
                return jsonify({"error": "Token tidak valid atau sudah expired"}), 401

            # Inject current_user into Flask g context
            g.current_user = user
            g.db_session = session

            response = f(*args, **kwargs)
            return response
        except Exception:
            return jsonify({"error": "Token tidak valid atau sudah expired"}), 401
        finally:
            close_session(session)

    return decorated


def admin_required(f):
    """Decorator that validates JWT AND checks role == 'admin'."""
    @wraps(f)
    @auth_required
    def decorated(*args, **kwargs):
        # auth_required already validated the token and set g.current_user
        if g.current_user.role != 'admin':
            return jsonify({"error": "Akses ditolak"}), 403

        return f(*args, **kwargs)

    return decorated
