"""In-memory rate limiter for login attempts."""

import time
from threading import Lock


class LoginRateLimiter:
    """In-memory rate limiter: 5 attempts per email, 5-minute lockout."""

    MAX_ATTEMPTS = 5
    LOCKOUT_SECONDS = 300  # 5 minutes

    def __init__(self):
        # Dict mapping email -> {"attempts": int, "locked_until": float|None}
        self._store: dict[str, dict] = {}
        self._lock = Lock()

    def is_locked(self, email: str) -> bool:
        """Check if the given email is currently locked out.

        Returns True if the email has reached the max attempts and the
        lockout period has not yet expired.
        """
        email = email.lower()
        with self._lock:
            entry = self._store.get(email)
            if entry is None:
                return False

            locked_until = entry.get("locked_until")
            if locked_until is None:
                return False

            if time.time() < locked_until:
                return True

            # Lockout expired — reset the entry
            del self._store[email]
            return False

    def record_failure(self, email: str) -> None:
        """Record a failed login attempt for the given email.

        After exactly 5 consecutive failures, the email is locked out
        for 5 minutes.
        """
        email = email.lower()
        with self._lock:
            entry = self._store.get(email)
            if entry is None:
                entry = {"attempts": 0, "locked_until": None}
                self._store[email] = entry

            entry["attempts"] += 1

            if entry["attempts"] >= self.MAX_ATTEMPTS:
                entry["locked_until"] = time.time() + self.LOCKOUT_SECONDS

    def reset(self, email: str) -> None:
        """Reset the failure count for the given email (called on successful login)."""
        email = email.lower()
        with self._lock:
            self._store.pop(email, None)
