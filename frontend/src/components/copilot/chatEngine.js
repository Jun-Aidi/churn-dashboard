// ══════════════════════════════════════════════════════════════════════════════
// Chat Engine — Frontend API Client
// Sends messages to backend LLM + RAG powered chatbot.
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

// Generate a session ID per browser tab
const SESSION_ID = 'session_' + Math.random().toString(36).substring(2, 10);

/**
 * Send user message to backend chatbot and receive response.
 */
export async function processChat(message) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: SESSION_ID }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.response;
  } catch (err) {
    console.warn('Backend tidak tersedia:', err.message);
    return (
      '<i class="fa-solid fa-circle-exclamation" style="color: #dc2626;"></i> '
      + '**Backend tidak tersedia.**\n\n'
      + 'Pastikan server Flask sudah berjalan:\n'
      + '```\ncd backend\n.\\venv\\Scripts\\Activate.ps1\npython run.py\n```\n\n'
      + 'Setelah backend aktif, coba kirim pesan lagi.'
    );
  }
}
