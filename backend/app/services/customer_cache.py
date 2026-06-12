"""
Customer Data Cache — per-user in-memory DataFrame cache with short TTL.

Avoids re-querying the full `customers` table and rebuilding a DataFrame on
every request within a short window. A single Dashboard page load fans out to
several endpoints (/customers, /trend, /customers/stats) that all need the same
data; this cache makes them share one load.

Cache freshness is guaranteed by:
  - a short TTL (default 60s), and
  - explicit invalidation on writes (add_customer, /upload).
"""

import time
import threading


class CustomerDataCache:
    """Cache DataFrame customer per user dengan TTL pendek."""

    def __init__(self, ttl_seconds: int = 60):
        self._store = {}          # user_id -> (df, timestamp)
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get(self, user_id):
        """Return cached DataFrame for user_id if present and not expired."""
        with self._lock:
            entry = self._store.get(user_id)
            if entry:
                df, ts = entry
                if time.time() - ts < self._ttl:
                    return df
                del self._store[user_id]
            return None

    def set(self, user_id, df):
        """Store a DataFrame for user_id with the current timestamp."""
        with self._lock:
            self._store[user_id] = (df, time.time())

    def invalidate(self, user_id=None):
        """Invalidate one user's cache, or all if user_id is None."""
        with self._lock:
            if user_id is None:
                self._store.clear()
            else:
                self._store.pop(user_id, None)


customer_data_cache = CustomerDataCache(ttl_seconds=60)


def invalidate_user_caches(user_id=None):
    """Single entry point to invalidate all per-user caches.

    Currently invalidates the customer DataFrame cache. The semantic chat
    cache (Phase 7) is invalidated here too via a lazy import so callers (e.g.
    the /upload route) only need one call.
    """
    customer_data_cache.invalidate(user_id)

    # Semantic chat cache (optional — only present once Phase 7 is wired in).
    try:
        from app.nlp.cache_engine import cache_invalidate
        cache_invalidate(user_id)
    except Exception:
        # cache_engine not available or cache disabled — safe to ignore.
        pass
