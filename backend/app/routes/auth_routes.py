"""
Auth routes Blueprint — login, logout, user profile, admin user management, and system statistics.
"""

import re
from flask import Blueprint, request, jsonify, g
import bcrypt
from sqlalchemy import func

from app.database import get_session, close_session, Customer, Prediction, ChatHistory
from app.models.user import User
from app.utils.jwt_utils import create_token
from app.utils.rate_limiter import LoginRateLimiter
from app.middleware.auth import auth_required, admin_required

auth_bp = Blueprint('auth', __name__)

# Shared rate limiter instance
rate_limiter = LoginRateLimiter()


# --- Helper Functions ---

def _validate_email(email: str) -> bool:
    """Validate email format."""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def _validate_user_input(data, is_update=False):
    """Validate user creation/update input. Returns (errors list, None) or (None, validated_data)."""
    errors = []

    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    # For updates, only validate fields that are present
    if not is_update:
        # All fields required for creation
        if not name or not isinstance(name, str) or not name.strip():
            errors.append("nama harus diisi (1-100 karakter)")
        elif len(name.strip()) > 100:
            errors.append("nama maksimal 100 karakter")

        if not email or not isinstance(email, str):
            errors.append("email harus diisi dengan format valid")
        elif not _validate_email(email):
            errors.append("format email tidak valid")

        if not password or not isinstance(password, str):
            errors.append("password harus diisi (minimal 8 karakter)")
        elif len(password) < 8:
            errors.append("password minimal 8 karakter")

        if not role or role not in ('admin', 'user'):
            errors.append("role harus 'admin' atau 'user'")
    else:
        # For updates, validate only provided fields
        if name is not None:
            if not isinstance(name, str) or not name.strip():
                errors.append("nama harus diisi (1-100 karakter)")
            elif len(name.strip()) > 100:
                errors.append("nama maksimal 100 karakter")

        if email is not None:
            if not isinstance(email, str) or not _validate_email(email):
                errors.append("format email tidak valid")

        if password is not None:
            if not isinstance(password, str) or len(password) < 8:
                errors.append("password minimal 8 karakter")

        if role is not None:
            if role not in ('admin', 'user'):
                errors.append("role harus 'admin' atau 'user'")

    return errors


def _user_to_dict(user):
    """Convert User model to dictionary for JSON response."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# --- Login / Logout / Me Endpoints ---

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user with email and password, return JWT."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Email atau password salah"}), 401

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email atau password salah"}), 401

    # Check rate limiting
    if rate_limiter.is_locked(email):
        return jsonify({"error": "Terlalu banyak percobaan. Coba lagi dalam 5 menit."}), 429

    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        user = session.query(User).filter_by(email=email).first()

        # User not found - uniform error
        if user is None:
            rate_limiter.record_failure(email)
            return jsonify({"error": "Email atau password salah"}), 401

        # Check if account is active
        if not user.is_active:
            return jsonify({"error": "Akun Anda telah dinonaktifkan"}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            rate_limiter.record_failure(email)
            return jsonify({"error": "Email atau password salah"}), 401

        # Successful login - reset rate limiter
        rate_limiter.reset(email)

        # Generate JWT token
        token = create_token(user)

        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            }
        }), 200

    except Exception:
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


@auth_bp.route('/logout', methods=['POST'])
@auth_required
def logout():
    """Logout - client-side token invalidation."""
    return jsonify({"message": "Logout berhasil"}), 200


@auth_bp.route('/me', methods=['GET'])
@auth_required
def get_me():
    """Return current authenticated user profile."""
    user = g.current_user
    return jsonify({
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
    }), 200


# --- Admin User Management Endpoints ---

@auth_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """List all users (admin only), sorted by created_at desc."""
    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        users = session.query(User).order_by(User.created_at.desc()).all()
        return jsonify({
            "users": [_user_to_dict(u) for u in users]
        }), 200
    except Exception:
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


@auth_bp.route('/users', methods=['POST'])
@admin_required
def create_user():
    """Create a new user (admin only) with validation."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Validasi gagal: data tidak valid"}), 422

    # Validate input
    errors = _validate_user_input(data, is_update=False)
    if errors:
        return jsonify({"error": f"Validasi gagal: {', '.join(errors)}"}), 422

    name = data['name'].strip()
    email = data['email'].strip().lower()
    password = data['password']
    role = data['role']

    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        # Check for duplicate email
        existing = session.query(User).filter_by(email=email).first()
        if existing:
            return jsonify({"error": "Email sudah digunakan"}), 409

        # Hash password with bcrypt (cost factor 12)
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        ).decode('utf-8')

        # Create user
        new_user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            is_active=True,
        )
        session.add(new_user)
        session.commit()

        return jsonify({
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "is_active": new_user.is_active,
            }
        }), 201

    except Exception:
        session.rollback()
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user fields (admin only)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Validasi gagal: data tidak valid"}), 422

    # Validate input (update mode - only validates provided fields)
    errors = _validate_user_input(data, is_update=True)
    if errors:
        return jsonify({"error": f"Validasi gagal: {', '.join(errors)}"}), 422

    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        user = session.query(User).filter_by(id=user_id).first()
        if user is None:
            return jsonify({"error": "Pengguna tidak ditemukan"}), 404

        # Update fields that are provided
        if 'name' in data and data['name'] is not None:
            user.name = data['name'].strip()

        if 'email' in data and data['email'] is not None:
            new_email = data['email'].strip().lower()
            # Check duplicate email (only if email is changing)
            if new_email != user.email:
                existing = session.query(User).filter_by(email=new_email).first()
                if existing:
                    return jsonify({"error": "Email sudah digunakan"}), 409
            user.email = new_email

        if 'role' in data and data['role'] is not None:
            user.role = data['role']

        if 'password' in data and data['password'] is not None:
            password_hash = bcrypt.hashpw(
                data['password'].encode('utf-8'),
                bcrypt.gensalt(rounds=12)
            ).decode('utf-8')
            user.password_hash = password_hash

        session.commit()

        return jsonify({
            "user": _user_to_dict(user)
        }), 200

    except Exception:
        session.rollback()
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


@auth_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """Deactivate a user (admin only). Prevents self-deactivation."""
    # Prevent self-deactivation
    if g.current_user.id == user_id:
        return jsonify({"error": "Admin tidak dapat menonaktifkan akun sendiri"}), 400

    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        user = session.query(User).filter_by(id=user_id).first()
        if user is None:
            return jsonify({"error": "Pengguna tidak ditemukan"}), 404

        user.is_active = False
        session.commit()

        return jsonify({
            "user": _user_to_dict(user)
        }), 200

    except Exception:
        session.rollback()
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


@auth_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id):
    """Activate a user (admin only)."""
    session = get_session()
    if session is None:
        return jsonify({"error": "Terjadi kesalahan server"}), 500

    try:
        user = session.query(User).filter_by(id=user_id).first()
        if user is None:
            return jsonify({"error": "Pengguna tidak ditemukan"}), 404

        user.is_active = True
        session.commit()

        return jsonify({
            "user": _user_to_dict(user)
        }), 200

    except Exception:
        session.rollback()
        return jsonify({"error": "Terjadi kesalahan server"}), 500
    finally:
        close_session(session)


# --- Admin System Statistics Endpoint ---

@auth_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Return system statistics (admin only).

    Returns counts for active/inactive users, total customers,
    total predictions, and total chat sessions (distinct session_ids).
    Returns 503 if database is unavailable.
    """
    session = get_session()
    if session is None:
        return jsonify({"error": "Data sistem tidak tersedia"}), 503

    try:
        active_users = session.query(User).filter_by(is_active=True).count()
        inactive_users = session.query(User).filter_by(is_active=False).count()
        total_customers = session.query(Customer).count()
        total_predictions = session.query(Prediction).count()
        total_chat_sessions = session.query(
            func.count(func.distinct(ChatHistory.session_id))
        ).scalar() or 0

        return jsonify({
            "active_users": active_users,
            "inactive_users": inactive_users,
            "total_customers": total_customers,
            "total_predictions": total_predictions,
            "total_chat_sessions": total_chat_sessions
        }), 200

    except Exception:
        return jsonify({"error": "Data sistem tidak tersedia"}), 503
    finally:
        close_session(session)
