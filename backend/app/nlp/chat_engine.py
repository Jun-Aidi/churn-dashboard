"""
Chat Engine — Main entry point for chatbot.
Uses LLM (DeepSeek) as primary brain with RAG retrieval.
Implements 3-layer guardrails.
"""

import re
import uuid
from datetime import datetime
from typing import Optional

from app.nlp.llm_client import chat_with_llm, is_available as llm_available
from app.nlp.rag_engine import is_available as rag_available

# ══════════════════════════════════════════════════════════════════════════════
# LAYER 1: INPUT FILTER — Prompt Injection Detection
# ══════════════════════════════════════════════════════════════════════════════

INJECTION_PATTERNS = [
    r'lupakan\s*(semua\s*)?(perintah|instruksi|aturan)',
    r'abaikan\s*(semua\s*)?(perintah|instruksi|aturan|prompt)',
    r'ignore\s*(all\s*)?(previous|prior|above)?\s*(instructions?|prompts?|rules?)',
    r'forget\s*(all\s*)?(previous|prior|above)',
    r'you\s*are\s*now',
    r'act\s*as\s*(if|a|an)',
    r'pretend\s*(you|to\s*be)',
    r'new\s*instructions?',
    r'override\s*(system|prompt|instructions?)',
    r'jangan\s*ikuti\s*(aturan|perintah)',
    r'ubah\s*(peran|persona|perilaku)',
    r'system\s*prompt',
    r'reveal\s*(your|the)\s*(instructions?|prompt|rules?)',
    r'tampilkan\s*(instruksi|prompt|aturan)\s*(sistem|kamu)',
    r'kamu\s*sekarang\s*(adalah|jadi)',
]


def _is_prompt_injection(message: str) -> bool:
    """Detect prompt injection attempts."""
    text = message.lower().strip()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _get_rejection_message() -> str:
    """Polite rejection message."""
    return (
        "Maaf, saya hanya bisa membantu dengan analisis customer churn "
        "dan strategi retensi pelanggan. 😊\n\n"
        "Beberapa hal yang bisa saya bantu:\n"
        "- Analisis risiko pelanggan tertentu\n"
        "- Faktor penyebab churn\n"
        "- Rekomendasi strategi retensi\n"
        "- Statistik dan tren churn\n\n"
        "Ada yang bisa saya bantu terkait data pelanggan Anda?"
    )


# ══════════════════════════════════════════════════════════════════════════════
# LAYER 3: OUTPUT VALIDATION
# ══════════════════════════════════════════════════════════════════════════════

_OFF_TOPIC_INDICATORS = [
    'sebagai AI bahasa', 'sebagai model bahasa', 'saya tidak memiliki perasaan',
    'here is a poem', 'once upon a time', 'berikut puisi',
]


def _validate_output(response: str) -> str:
    """Validate LLM output — replace if off-topic detected."""
    lower = response.lower()
    for indicator in _OFF_TOPIC_INDICATORS:
        if indicator.lower() in lower:
            return _get_rejection_message()
    return response


# ══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def process_chat(message: str, session_id: Optional[str] = None, user_id: Optional[int] = None) -> dict:
    """
    Process user message through the full pipeline.
    Returns dict with 'response', 'source', 'tokens_used'.

    `user_id` scopes all data lookups (customer profile, statistics, high-risk
    list, segments) to the logged-in user's own dashboard data.
    """
    if not session_id:
        session_id = str(uuid.uuid4())[:8]

    text = message.strip()
    if not text:
        return {
            'response': "Silakan ketik pertanyaan Anda.",
            'source': 'fallback',
            'tokens_used': 0
        }

    # ── Layer 1: Input Filter ──
    if _is_prompt_injection(text):
        return {
            'response': _get_rejection_message(),
            'source': 'blocked',
            'tokens_used': 0
        }

    # ── LLM Pipeline ──
    if llm_available():
        # Layer 2.5: Semantic cache lookup (conceptual questions only, per-user)
        cached = _cache_lookup_safe(text, user_id)
        if cached is not None:
            # Cache hit tetap dicatat ke history (source='cache', tokens_used=0)
            _save_chat_history(session_id, text, cached, user_id)
            return cached

        result = chat_with_llm(text, session_id, user_id=user_id)

        # Layer 3: Output Validation
        result['response'] = _validate_output(result['response'])

        # Store conceptual answers in the semantic cache (per-user)
        _cache_store_safe(text, result, user_id)

        # Save to chat history (if DB available)
        _save_chat_history(session_id, text, result, user_id)

        return result

    # ── Fallback: No LLM available ──
    return {
        'response': (
            "LLM belum dikonfigurasi. Untuk mengaktifkan chatbot AI:\n\n"
            "1. Set `DEEPSEEK_API_KEY` di file `.env`\n"
            "2. Restart server\n\n"
            "Sementara itu, dashboard tetap bisa digunakan untuk melihat data pelanggan."
        ),
        'source': 'fallback',
        'tokens_used': 0
    }


# ══════════════════════════════════════════════════════════════════════════════
# STREAMING ENTRY POINT (with early-buffer Layer 3 validation)
# ══════════════════════════════════════════════════════════════════════════════

# Hold back this many leading characters and run Layer 3 on them BEFORE flushing
# to the user. Off-topic markers ("berikut puisi", "here is a poem", ...) almost
# always appear at the very start, so a small buffer catches them while keeping
# time-to-first-token low.
BUFFER_VALIDATION_CHARS = 120


def _is_offtopic(text: str) -> bool:
    """True if any off-topic indicator appears in text (Layer 3 core check)."""
    lower = text.lower()
    return any(indicator.lower() in lower for indicator in _OFF_TOPIC_INDICATORS)


def process_chat_stream(message: str, session_id: Optional[str] = None,
                        user_id: Optional[int] = None):
    """Streaming pipeline. Yields event dicts consumed by the SSE route:
        {"type": "token", "text": str}
        {"type": "done", "source": str, "tokens_used": int}

    Guardrails preserved:
      - Layer 1 (input filter) runs before any LLM call.
      - Layer 3 runs as (a) an early-buffer gate before the first flush, and
        (b) a full-text validation on the complete answer before it is stored
        in the semantic cache / chat history (storage integrity).
    """
    if not session_id:
        session_id = str(uuid.uuid4())[:8]

    text = message.strip()
    if not text:
        msg = "Silakan ketik pertanyaan Anda."
        yield {"type": "token", "text": msg}
        yield {"type": "done", "source": "fallback", "tokens_used": 0}
        return

    # ── Layer 1: Input Filter ──
    if _is_prompt_injection(text):
        msg = _get_rejection_message()
        yield {"type": "token", "text": msg}
        _save_chat_history(session_id, text,
                           {"response": msg, "source": "blocked", "tokens_used": 0}, user_id)
        yield {"type": "done", "source": "blocked", "tokens_used": 0}
        return

    if not llm_available():
        msg = (
            "LLM belum dikonfigurasi. Untuk mengaktifkan chatbot AI:\n\n"
            "1. Set `DEEPSEEK_API_KEY` di file `.env`\n"
            "2. Restart server\n\n"
            "Sementara itu, dashboard tetap bisa digunakan untuk melihat data pelanggan."
        )
        yield {"type": "token", "text": msg}
        yield {"type": "done", "source": "fallback", "tokens_used": 0}
        return

    # ── Layer 2.5: Semantic cache (conceptual questions only, per-user) ──
    cached = _cache_lookup_safe(text, user_id)
    if cached is not None:
        yield {"type": "token", "text": cached["response"]}
        _save_chat_history(session_id, text, cached, user_id)
        yield {"type": "done", "source": "cache", "tokens_used": 0}
        return

    # ── Stream from LLM with early-buffer Layer 3 gate ──
    from app.nlp.llm_client import chat_with_llm_stream

    buffer = ""
    validated = False
    blocked = False
    full_text = ""
    source = "llm_direct"
    tokens_used = 0

    for ev in chat_with_llm_stream(text, session_id, user_id=user_id):
        if ev["type"] == "token":
            chunk = ev["text"]
            full_text += chunk
            if blocked:
                continue
            if validated:
                yield {"type": "token", "text": chunk}
            else:
                buffer += chunk
                if len(buffer) >= BUFFER_VALIDATION_CHARS:
                    if _is_offtopic(buffer):
                        blocked = True
                        yield {"type": "token", "text": _get_rejection_message()}
                    else:
                        validated = True
                        yield {"type": "token", "text": buffer}
        elif ev["type"] == "done":
            source = ev.get("source", source)
            tokens_used = ev.get("tokens_used", 0)
            full_text = ev.get("full", full_text) or full_text

    # Short answer that never reached the buffer threshold: validate & flush now.
    if not blocked and not validated:
        if _is_offtopic(buffer):
            blocked = True
            yield {"type": "token", "text": _get_rejection_message()}
        elif buffer:
            validated = True
            yield {"type": "token", "text": buffer}

    # Determine the canonical answer for STORAGE (full-text Layer 3).
    if blocked:
        final_response = _get_rejection_message()
        final_source = "blocked"
    else:
        final_response = _validate_output(full_text)
        final_source = "blocked" if final_response != full_text else source

    result = {"response": final_response, "source": final_source, "tokens_used": tokens_used}
    if final_source not in ("blocked", "fallback", "cache"):
        _cache_store_safe(text, result, user_id)
    _save_chat_history(session_id, text, result, user_id)

    yield {"type": "done", "source": final_source, "tokens_used": tokens_used}


def _cache_lookup_safe(text: str, user_id):
    """Look up the semantic cache, swallowing any errors."""
    if user_id is None:
        return None
    try:
        from app.nlp.cache_engine import cache_lookup
        return cache_lookup(text, user_id)
    except Exception as e:
        print(f"[Chat] Cache lookup skipped: {e}")
        return None


def _cache_store_safe(text: str, result: dict, user_id):
    """Store a conceptual answer in the semantic cache, swallowing errors.

    Only store answers that came straight from the LLM/RAG pipeline (not
    blocked/fallback/cache responses)."""
    if user_id is None:
        return
    if result.get('source') in ('blocked', 'fallback', 'cache'):
        return
    try:
        from app.nlp.cache_engine import cache_store
        cache_store(text, result.get('response', ''), user_id)
    except Exception as e:
        print(f"[Chat] Cache store skipped: {e}")


def _save_chat_history(session_id: str, user_message: str, result: dict, user_id: Optional[int] = None):
    """Save conversation to database."""
    try:
        from app.database import get_session, close_session, ChatHistory

        session = get_session()
        if session:
            chat = ChatHistory(
                session_id=session_id,
                user_id=user_id,
                user_message=user_message,
                bot_response=result.get('response', ''),
                source=result.get('source', 'unknown'),
                tokens_used=result.get('tokens_used', 0),
                created_at=datetime.utcnow()
            )
            session.add(chat)
            session.commit()
            close_session(session)
    except Exception as e:
        print(f"[Chat] Failed to save history: {e}")
