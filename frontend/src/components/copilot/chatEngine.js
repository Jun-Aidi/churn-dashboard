// ══════════════════════════════════════════════════════════════════════════════
// Chat Engine — Frontend API Client
// Sends messages to backend LLM + RAG powered chatbot.
// Requests are authenticated so the backend scopes answers to the logged-in
// user's own dashboard data.
// ══════════════════════════════════════════════════════════════════════════════

import { fetchWithAuth } from '../../api/index';

// Default = path relatif untuk produksi; localhost hanya dari .env.development (npm run dev).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// Generate a session ID per browser tab
const SESSION_ID = 'session_' + Math.random().toString(36).substring(2, 10);

const BACKEND_UNAVAILABLE_MSG = (
  '<i class="fa-solid fa-circle-exclamation" style="color: #dc2626;"></i> '
  + '**Backend tidak tersedia.**\n\n'
  + 'Pastikan server Flask sudah berjalan:\n'
  + '```\ncd backend\n.\\venv\\Scripts\\Activate.ps1\npython run.py\n```\n\n'
  + 'Setelah backend aktif, coba kirim pesan lagi.'
);

/**
 * Send user message to backend chatbot and receive the full response at once.
 * (Non-streaming — kept for backward compatibility / fallback.)
 */
export async function processChat(message) {
  try {
    const res = await fetchWithAuth(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: SESSION_ID }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.response;
  } catch (err) {
    console.warn('Backend tidak tersedia:', err.message);
    return BACKEND_UNAVAILABLE_MSG;
  }
}

/**
 * Stream the chatbot answer token-by-token via Server-Sent Events.
 *
 * Consumes POST /api/chat/stream. Each SSE message is a JSON event:
 *   { "type": "token", "text": "..." }   — append to the answer
 *   { "type": "done",  "source": "...", "tokens_used": N }
 *
 * Callbacks:
 *   onToken(chunk, fullSoFar) — called for each token chunk
 *   onDone(fullText, meta)    — called once when the stream ends
 *   onError(err)              — called on network/stream failure (optional)
 *
 * Returns the full accumulated text.
 */
export async function processChatStream(message, { onToken, onDone, onError } = {}) {
  const token = localStorage.getItem('token');
  let full = '';

  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: SESSION_ID }),
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return '';
    }
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let meta = { source: 'unknown', tokens_used: 0 };

    // Parse the SSE stream: events are separated by a blank line ("\n\n").
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!rawEvent.startsWith('data:')) continue;

        const payload = rawEvent.slice(5).trim();
        if (!payload) continue;

        let ev;
        try {
          ev = JSON.parse(payload);
        } catch {
          continue;
        }

        if (ev.type === 'token') {
          full += ev.text;
          onToken?.(ev.text, full);
        } else if (ev.type === 'done') {
          meta = { source: ev.source, tokens_used: ev.tokens_used };
        }
      }
    }

    onDone?.(full, meta);
    return full;
  } catch (err) {
    console.warn('Streaming chatbot gagal:', err.message);
    onError?.(err);
    // Graceful fallback so the user still sees something useful.
    const fallback = full || BACKEND_UNAVAILABLE_MSG;
    onDone?.(fallback, { source: 'fallback', tokens_used: 0 });
    return fallback;
  }
}
