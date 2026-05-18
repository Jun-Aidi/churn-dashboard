// ══════════════════════════════════════════════════════════════════════════════
// Chat Engine — Frontend API Client
// NLP processing dilakukan sepenuhnya di backend (Python/Flask).
// Frontend hanya mengirim pesan dan menerima response.
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

/**
 * Kirim pesan user ke backend NLP engine dan terima response.
 */
export async function processChat(message) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
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
