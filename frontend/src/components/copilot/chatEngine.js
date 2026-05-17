// ══════════════════════════════════════════════════════════════════════════════
// Chat Engine — Frontend API Client
// NLP processing sekarang dilakukan di backend (Python).
// Frontend hanya mengirim pesan dan menerima response.
// ══════════════════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

/**
 * Kirim pesan user ke backend NLP engine dan terima response.
 * Fallback ke local processing jika backend tidak tersedia.
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
    // Fallback: jika backend mati, gunakan local NLP engine
    console.warn('Backend tidak tersedia, menggunakan local NLP:', err.message);
    const { classifyIntent } = await import('./nlpEngine.js');
    return handleLocalFallback(message, classifyIntent);
  }
}

/**
 * Local fallback handler — menggunakan NLP engine di frontend
 * sebagai backup jika backend tidak bisa dihubungi.
 */
async function handleLocalFallback(message, classifyIntent) {
  const { customers, getRiskClass } = await import('../../api/index.js');
  const result = classifyIntent(message);
  const { intent, confidence, entities } = result;

  const allCustomers = customers.map(c => ({
    ...c,
    risk: getRiskClass(c.score),
  }));

  switch (intent) {
    case 'GREETING':
      return `Halo! Ghosting siap membantu (mode offline) <i class="fa-solid fa-robot" style="color: #4f8ef7;"></i>\n\n⚠️ Backend tidak tersedia. Beberapa fitur mungkin terbatas.\n\nAnda bisa bertanya:\n- *"Apa faktor utama churn?"*\n- *"Berapa pelanggan risiko tinggi?"*`;

    case 'FAKTOR_CHURN':
      return `**Faktor Utama Churn (Offline Mode):**\n\n1. Hari Sejak Login Terakhir — 11.45%\n2. Support Tickets — 10.07%\n3. Monthly Usage — 9.98%\n4. Feature Adoption — 9.21%\n5. Contract Type — 8.54%`;

    case 'JUMLAH_RISIKO_TINGGI': {
      const high = allCustomers.filter(c => c.risk.cls === 'high').length;
      return `Saat ini terdapat **${high} pelanggan** dalam kategori Risiko Tinggi (mode offline).`;
    }

    case 'ANALISIS_PELANGGAN': {
      const cid = entities?.customerId;
      if (!cid) return 'Sebutkan Customer ID (contoh: C-0001).';
      const c = allCustomers.find(x => x.id === cid);
      if (!c) return `Pelanggan ${cid} tidak ditemukan.`;
      return `**${cid}** — ${c.plan} (${c.contract}) | Risiko: ${c.score}% | Revenue: Rp ${c.revenue.toLocaleString('id-ID')}`;
    }

    default:
      return `Maaf, backend tidak tersedia dan saya tidak bisa memproses permintaan ini secara offline.\n\nPastikan backend berjalan: \`python run.py\``;
  }
}
