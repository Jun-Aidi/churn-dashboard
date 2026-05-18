// ══════════════════════════════════════════
// API Layer — Fetches data from Flask backend
// ══════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';

// ── Risk classification (shared utility) ──
export function getRiskClass(score) {
  if (score >= 66) return { cls: 'high', label: 'Risiko Tinggi', color: '#e03d3d' };
  if (score >= 31) return { cls: 'med',  label: 'Risiko Sedang', color: '#d4a017' };
  return                 { cls: 'low',  label: 'Risiko Rendah', color: '#2da44e' };
}

// ── API Fetch helpers ──
export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCustomer(id) {
  const res = await fetch(`${API_BASE}/customers/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/customers/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTrend() {
  const res = await fetch(`${API_BASE}/trend`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPredict(formData) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Factor analysis (client-side, based on customer data) ──
export function getFactors(c) {
  const factors = [];

  if (c.lastLogin > 60) {
    factors.push({ sev: 'critical', name: 'Tidak Aktif Sangat Lama', detail: `Terakhir login ${c.lastLogin} hari lalu — jauh di atas rata-rata normal.`, impact: 35, bar: 90 });
  } else if (c.lastLogin > 30) {
    factors.push({ sev: 'warning',  name: 'Jarang Login', detail: `Terakhir login ${c.lastLogin} hari lalu. Engagement rendah.`, impact: 22, bar: 60 });
  } else if (c.lastLogin > 14) {
    factors.push({ sev: 'caution',  name: 'Login Agak Jarang', detail: `Terakhir login ${c.lastLogin} hari lalu. Pantau lebih lanjut.`, impact: 10, bar: 30 });
  }

  if (c.tickets >= 10) {
    factors.push({ sev: 'critical', name: 'Banyak Keluhan / Tiket Support', detail: `${c.tickets} tiket dalam 90 hari — indikasi frustasi tinggi dengan produk.`, impact: 30, bar: 80 });
  } else if (c.tickets >= 5) {
    factors.push({ sev: 'warning',  name: 'Keluhan Moderat', detail: `${c.tickets} tiket support dalam 90 hari terakhir.`, impact: 18, bar: 50 });
  } else if (c.tickets >= 2) {
    factors.push({ sev: 'caution',  name: 'Ada Beberapa Tiket Support', detail: `${c.tickets} tiket support dalam 90 hari terakhir.`, impact: 8, bar: 22 });
  }

  if (c.adoption < 30) {
    factors.push({ sev: 'critical', name: 'Adopsi Fitur Sangat Rendah', detail: `Hanya ${c.adoption}% fitur yang dipakai — nilai produk tidak tersampaikan.`, impact: 28, bar: 75 });
  } else if (c.adoption < 55) {
    factors.push({ sev: 'warning',  name: 'Adopsi Fitur Kurang Optimal', detail: `${c.adoption}% adopsi fitur. Masih banyak fitur yang belum dimanfaatkan.`, impact: 16, bar: 45 });
  }

  if (c.usage < 10) {
    factors.push({ sev: 'critical', name: 'Penggunaan Produk Sangat Rendah', detail: `Hanya ${c.usage} jam/bulan. Kemungkinan tidak mendapat nilai dari produk.`, impact: 25, bar: 70 });
  } else if (c.usage < 20) {
    factors.push({ sev: 'warning',  name: 'Penggunaan Produk Rendah', detail: `${c.usage} jam/bulan. Di bawah rata-rata untuk plan ${c.plan}.`, impact: 15, bar: 42 });
  }

  if (c.contract === 'monthly' || c.contract === 'Monthly') {
    factors.push({ sev: 'caution', name: 'Kontrak Bulanan (Mudah Cancel)', detail: 'Kontrak Monthly memberikan fleksibilitas tinggi untuk berhenti kapan saja.', impact: 10, bar: 28 });
  }

  if (c.delay >= 3) {
    factors.push({ sev: 'warning', name: 'Keterlambatan Pembayaran Berulang', detail: `${c.delay}x keterlambatan pembayaran — sinyal potensi churn karena finansial.`, impact: 12, bar: 35 });
  }

  if (c.nps <= 2) {
    factors.push({ sev: 'caution', name: 'Skor NPS Rendah', detail: `NPS score ${c.nps} — pelanggan cenderung tidak merekomendasikan produk.`, impact: 8, bar: 22 });
  }

  if (factors.length === 0) {
    factors.push({ sev: 'caution', name: 'Performa Dalam Batas Normal', detail: 'Tidak ada faktor risiko signifikan yang terdeteksi saat ini.', impact: 5, bar: 10 });
  }

  return factors.slice(0, 4);
}

export function getRecos(c) {
  const r = [];

  if (c.lastLogin > 30) {
    r.push({ type: 'urgent',    icon: 'fa-solid fa-phone', title: 'Re-engagement Call Segera', desc: `Hubungi ${c.name || c.id} via telepon/email. Tanya kebutuhan & hambatan. Jadwalkan dalam 48 jam.` });
  }

  if (c.tickets >= 5) {
    r.push({ type: 'important', icon: 'fa-solid fa-wrench', title: 'Eskalasi Tiket & Personal Support', desc: 'Assign dedicated support agent. Selesaikan semua tiket yang pending dan lakukan follow-up kepuasan.' });
  }

  if (c.adoption < 55 || c.usage < 20) {
    r.push({ type: 'normal',    icon: 'fa-solid fa-book', title: 'Sesi Onboarding & Edukasi Fitur', desc: `Jadwalkan demo 1-on-1 untuk fitur-fitur yang belum dipakai. Fokus pada use case spesifik plan ${c.plan}.` });
  }

  if ((c.contract === 'monthly' || c.contract === 'Monthly') && c.score >= 60) {
    r.push({ type: 'important', icon: 'fa-solid fa-gift', title: 'Tawarkan Diskon Upgrade ke Annual', desc: 'Berikan penawaran khusus 2–3 bulan gratis jika upgrade ke kontrak Annual. Kurangi risiko cancel.' });
  }

  if (c.nps <= 3) {
    r.push({ type: 'info',      icon: 'fa-solid fa-chart-bar', title: 'Survey Kepuasan & Feedback Loop', desc: 'Kirim NPS survey detail, minta alasan skor rendah, dan buat action plan berdasarkan feedback.' });
  }

  if (r.length === 0) {
    r.push({ type: 'normal', icon: 'fa-solid fa-heart', title: 'Pertahankan Kualitas Layanan', desc: 'Pelanggan dalam kondisi baik. Tetap monitor dan berikan update produk secara berkala.' });
  }

  return r.slice(0, 4);
}

export default { getRiskClass, getFactors, getRecos, fetchCustomers, fetchCustomer, fetchStats, fetchTrend, fetchPredict };
