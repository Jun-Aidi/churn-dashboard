"""Unit tests for LoginRateLimiter."""

import time
from unittest.mock import patch

from app.utils.rate_limiter import LoginRateLimiter


class TestLoginRateLimiter:
    """Tests for the LoginRateLimiter class."""

    def setup_method(self):
        self.limiter = LoginRateLimiter()

    def test_new_email_is_not_locked(self):
        """A fresh email should not be locked."""
        assert self.limiter.is_locked("user@example.com") is False

    def test_fewer_than_5_failures_not_locked(self):
        """Less than 5 failures should not trigger lockout."""
        for _ in range(4):
            self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is False

    def test_exactly_5_failures_triggers_lockout(self):
        """Exactly 5 consecutive failures should lock the email."""
        for _ in range(5):
            self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is True

    def test_lockout_expires_after_5_minutes(self):
        """After 5 minutes, the lockout should expire."""
        for _ in range(5):
            self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is True

        # Simulate time passing beyond the lockout period
        with patch("app.utils.rate_limiter.time.time", return_value=time.time() + 301):
            assert self.limiter.is_locked("user@example.com") is False

    def test_reset_clears_failures(self):
        """Reset should clear the failure count allowing login again."""
        for _ in range(5):
            self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is True

        self.limiter.reset("user@example.com")
        assert self.limiter.is_locked("user@example.com") is False

    def test_email_is_case_insensitive(self):
        """Rate limiting should be case-insensitive for emails."""
        for _ in range(5):
            self.limiter.record_failure("User@Example.COM")
        assert self.limiter.is_locked("user@example.com") is True

    def test_different_emails_are_independent(self):
        """Rate limiting for one email should not affect another."""
        for _ in range(5):
            self.limiter.record_failure("user1@example.com")
        assert self.limiter.is_locked("user1@example.com") is True
        assert self.limiter.is_locked("user2@example.com") is False

    def test_reset_then_new_failures_count_from_zero(self):
        """After reset, failures should count from zero again."""
        for _ in range(4):
            self.limiter.record_failure("user@example.com")
        self.limiter.reset("user@example.com")

        # Should need 5 more failures to lock again
        for _ in range(4):
            self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is False

        self.limiter.record_failure("user@example.com")
        assert self.limiter.is_locked("user@example.com") is True
