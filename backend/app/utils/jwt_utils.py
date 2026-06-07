"""
JWT utility functions for token creation and validation.
"""

import jwt
from datetime import datetime, timedelta, timezone

from config import JWT_SECRET

ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24


def create_token(user) -> str:
    """Generate JWT with user_id, email, role, exp (24h)."""
    payload = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate JWT. Returns payload or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
