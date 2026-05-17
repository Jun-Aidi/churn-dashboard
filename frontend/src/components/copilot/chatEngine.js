// ── Mock Logic untuk NLP CS Copilot ──────────────────────────────────────────
import { customers as mockCustomers, getRiskClass } from '../../api/index';

// Enrich customers with risk field
const allCustomers = mockCustomers.map(c => ({
  ...c,
  risk: getRiskClass(c.score),
}));

/**
 * Memproses pesan user dan menghasilkan respons Copilot.
 * Mendeteksi intent menggunakan regex (rule-based NLP ringan).
 * Semua data berasal dari mock lokal — tidak butuh backend.
 */
export async function processChat(message) {
  const msg = message.toLowerCase();

  // ── Rule 1: Tanya Faktor Utama Churn (Global) ──
  if (msg.includes('faktor utama') || msg.includes('faktor churn') || msg.includes('penyebab churn') || msg.includes('kenapa churn')) {
    return `Berdasarkan analisis model Random Forest (Feature Importances), faktor utama churn pelanggan bulan ini adalah:\n\n**1. Hari Sejak Login Terakhir (11.45%)**\nBanyak pelanggan tidak aktif lebih dari 30 hari.\n**2. Skor Engagement (10.07%)**\nInteraksi dengan fitur premium sangat rendah.\n**3. Penggunaan Bulanan (9.98%)**\nPenurunan jam penggunaan harian secara drastis.\n\n**Saran Aksi:** Luncurkan kampanye *re-engagement email* untuk pelanggan yang belum login > 14 hari.`;
  }

  // ── Rule 2: Analisis VIP Berisiko Churn ──
  if (msg.includes('vip') || msg.includes('revenue tertinggi') || msg.includes('paling bernilai')) {
    const highRisk = allCustomers.filter(c => c.risk.cls === 'high');
    highRisk.sort((a, b) => b.revenue - a.revenue);
    const topVip = highRisk[0];

    if (!topVip) return 'Kabar baik! Saat ini tidak ada pelanggan berisiko tinggi.';

    return `<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i> **Peringatan VIP Churn!**\n\nPelanggan dengan potensi kerugian terbesar saat ini adalah **${topVip.id}**.\n\n- **Plan:** ${topVip.plan} (${topVip.contract})\n- **Revenue:** Rp ${topVip.revenue.toLocaleString('id-ID')}\n- **Skor Risiko:** ${topVip.score}% (${topVip.risk.label})\n- **Isu Utama:** Tidak login selama ${topVip.lastLogin} hari dan memiliki ${topVip.tickets} tiket support aktif.\n\n**Tindakan:** Tim CS Enterprise harus segera menjadwalkan *check-in call* hari ini!`;
  }

  // ── Rule 3: Berapa Jumlah Pelanggan Risiko Tinggi? ──
  if ((msg.includes('berapa') || msg.includes('jumlah')) && msg.includes('risiko tinggi')) {
    const highRiskCount = allCustomers.filter(c => c.risk.cls === 'high').length;
    return `Saat ini terdapat **${highRiskCount} pelanggan** yang berada dalam kategori **Risiko Tinggi** (probabilitas churn di atas 65%).\n\nAnda bisa melihat daftar lengkapnya di tab 'Risiko Tinggi' pada halaman Pelanggan.`;
  }

  // ── Rule 4: Profil Lengkap Pelanggan / Analisis Detail ──
  if (msg.includes('analisis') || msg.includes('profil') || msg.includes('detail pelanggan')) {
    const custIdMatch = msg.match(/c-\d+/i);
    if (!custIdMatch) return 'Mohon sebutkan Customer ID yang ingin dianalisis (contoh: \'Tolong analisis C-0001\').';
    
    const customerId = custIdMatch[0].toUpperCase();
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return `Pelanggan dengan ID **${customerId}** tidak ditemukan.`;

    return `<i class="fa-solid fa-magnifying-glass" style="color: #4f8ef7;"></i> **Profil Lengkap ${customerId}**\n\n- **Paket:** ${customer.plan} (${customer.contract})\n- **Tenure:** ${customer.tenure} bulan\n- **NPS Score:** ${customer.nps}/10\n- **Tiket Support:** ${customer.tickets} tiket\n- **Keterlambatan Bayar:** ${customer.delay} hari\n- **Status Risiko:** **${customer.score}% (${customer.risk.label})**\n\n*Catatan Ghosting:* ${customer.nps < 6 ? 'NPS sangat rendah (Detractor), pelanggan ini kemungkinan sangat tidak puas dengan layanan kita.' : 'Pelanggan memiliki tingkat kepuasan yang lumayan, coba tawarkan insentif penggunaan fitur.'}`;
  }

  // ── Rule 5: Strategi Retensi Umum ──
  if (msg.includes('strategi') || msg.includes('saran retensi') || msg.includes('cara mencegah')) {
    return `<i class="fa-solid fa-lightbulb" style="color: #eab308;"></i> **Strategi Retensi yang Disarankan Bulan Ini:**\n\n1. **Proactive Support:** Untuk pelanggan dengan tiket support > 5, CS harus proaktif menelepon mereka, bukan menunggu email.\n2. **Re-onboarding:** Pelanggan dengan 'Adopsi Fitur' < 30% perlu diundang ke webinar pelatihan gratis.\n3. **Flex-Payment:** Tawarkan opsi cicilan atau perpanjangan tempo untuk pelanggan yang menunggak lebih dari 3 hari.`;
  }

  // ── Rule 6: Minta Draf Email / Penawaran (Spesifik Pelanggan) ──
  const custIdMatchForEmail = msg.match(/c-\d+/i);
  if (msg.includes('draf email') || msg.includes('email') || msg.includes('penawaran') || msg.includes('pesan')) {
    if (!custIdMatchForEmail) return `Maaf, tolong sebutkan Customer ID-nya (contoh: C-0001) agar saya bisa menyesuaikan isi draf emailnya.`;

    const customerId = custIdMatchForEmail[0].toUpperCase();
    const customer = allCustomers.find(c => c.id === customerId);

    if (!customer) return `Pelanggan dengan ID **${customerId}** tidak ditemukan di database.`;

    const riskColor = customer.score > 50 ? 'Tinggi' : 'Sedang';
    return `Tentu, saya telah menganalisis pelanggan **${customerId}**.\n\n<i class="fa-solid fa-chart-column" style="color: #4f8ef7;"></i> **Analisis Ghosting:**\nPelanggan ini memiliki risiko churn **${riskColor}**. Mereka aktif ${customer.usage} jam/bulan namun belum login selama ${customer.lastLogin} hari.\n\nBerikut draf email penawaran yang dipersonalisasi:\n\n---\n\n**Subjek:** Kami Rindu Anda! Dapatkan Diskon Khusus untuk Upgrade Plan\n\n**Halo,**\n\nKami melihat Anda sudah ${customer.lastLogin} hari tidak mengunjungi dashboard kami. Kami memahami mungkin Anda sedang sibuk, tapi kami tidak ingin Anda melewatkan pembaruan fitur kami yang sangat berguna untuk efisiensi tim Anda.\n\nSebagai apresiasi karena Anda telah menggunakan layanan kami selama ${customer.tenure} bulan, kami memberikan **diskon eksklusif 20%** untuk perpanjangan langganan bulan ini.\n\nKlik tautan ini untuk mengaktifkan diskon Anda: [Tautan Promo]\n\nSalam Hangat,\nTim Customer Success\n\n---\n\nApakah draf ini ingin langsung disalin?`;
  }

  // ── Rule 7: Sapaan / Greeting ──
  if (msg.includes('halo') || msg.includes('hai') || msg.includes('pagi') || msg.includes('siang') || msg.includes('malam') || msg.includes('hello')) {
    return `Halo! Ghosting siap membantu <i class="fa-solid fa-robot" style="color: #4f8ef7;"></i>.\n\nAnda bisa mencoba bertanya:\n- *"Berapa jumlah pelanggan berisiko tinggi?"*\n- *"Siapa pelanggan VIP yang paling berisiko churn?"*\n- *"Tolong analisis profil C-0001"*`;
  }

  // ── Fallback ──
  return `Maaf, saya belum memahami maksud Anda.\n\nCoba gunakan perintah berikut:\n- *"Apa faktor utama churn?"*\n- *"Siapa pelanggan VIP yang berisiko?"*\n- *"Berapa pelanggan risiko tinggi?"*\n- *"Buatkan draf email untuk C-0001"*`;
}
