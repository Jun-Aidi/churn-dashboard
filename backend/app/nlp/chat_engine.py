"""
Chat Engine — Main entry point for chatbot.
Uses LLM (DeepSeek) as primary brain with optional BiLSTM fast-path.
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

def process_chat(message: str, session_id: Optional[str] = None) -> dict:
    """
    Process user message through the full pipeline.
    Returns dict with 'response', 'source', 'tokens_used'.
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
        result = chat_with_llm(text, session_id)

        # Layer 3: Output Validation
        result['response'] = _validate_output(result['response'])

        # Save to chat history (if DB available)
        _save_chat_history(session_id, text, result)

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


def _save_chat_history(session_id: str, user_message: str, result: dict):
    """Save conversation to database."""
    try:
        from app.database import get_session, close_session, ChatHistory

        session = get_session()
        if session:
            chat = ChatHistory(
                session_id=session_id,
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
