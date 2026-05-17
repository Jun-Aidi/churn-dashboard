// ══════════════════════════════════════════
// RAW DATA — Mock customer data
// ══════════════════════════════════════════
export const rawData = [
  { id: 'C-0001', plan: 'Starter',      contract: 'Monthly', tenure: 19, revenue: 112.58, usage: 20.1, users: 4,  adoption: 73.6, tickets: 0,  lastLogin: 34, nps: 0, delay: 4, churned: 1 },
  { id: 'C-0002', plan: 'Starter',      contract: 'Annual',  tenure: 14, revenue: 89.52,  usage: 25.6, users: 1,  adoption: 54.8, tickets: 15, lastLogin: 67, nps: 7, delay: 1, churned: 1 },
  { id: 'C-0003', plan: 'Professional', contract: 'Annual',  tenure: 23, revenue: 797.96, usage: 136.1,users: 9,  adoption: 66.0, tickets: 1,  lastLogin: 36, nps: 1, delay: 5, churned: 0 },
  { id: 'C-0004', plan: 'Starter',      contract: 'Monthly', tenure: 25, revenue: 57.24,  usage: 16.2, users: 2,  adoption: 15.2, tickets: 11, lastLogin: 37, nps: 4, delay: 0, churned: 1 },
  { id: 'C-0005', plan: 'Starter',      contract: 'Monthly', tenure: 28, revenue: 58.13,  usage: 12.5, users: 1,  adoption: 63.6, tickets: 6,  lastLogin: 11, nps: 3, delay: 3, churned: 0 },
  { id: 'C-0006', plan: 'Professional', contract: 'Annual',  tenure: 44, revenue: 745.1,  usage: 24.1, users: 10, adoption: 89.0, tickets: 15, lastLogin: 52, nps: 7, delay: 3, churned: 0 },
  { id: 'C-0007', plan: 'Professional', contract: 'Annual',  tenure: 22, revenue: 659.15, usage: 79.3, users: 12, adoption: 40.4, tickets: 9,  lastLogin: 42, nps: 9, delay: 0, churned: 1 },
  { id: 'C-0008', plan: 'Enterprise',   contract: 'Monthly', tenure: 40, revenue: 2189.46,usage: 265.2,users: 42, adoption: 27.2, tickets: 3,  lastLogin: 13, nps: 0, delay: 1, churned: 1 },
  { id: 'C-0009', plan: 'Starter',      contract: 'Monthly', tenure: 14, revenue: 85.26,  usage: 4.9,  users: 5,  adoption: 72.2, tickets: 4,  lastLogin: 24, nps: 3, delay: 1, churned: 0 },
];

const names = {
  'C-0001': 'Ahmad Fauzi',
  'C-0002': 'Siti Nurhaliza',
  'C-0003': 'Budi Santoso',
  'C-0004': 'Dewi Lestari',
  'C-0005': 'Rudi Hartono',
  'C-0006': 'Maya Sari',
  'C-0007': 'Hendra Wijaya',
  'C-0008': 'Rina Kusuma',
  'C-0009': 'Farhan Maulana',
};

const avatarEmoji = [
  'fa-solid fa-user',
  'fa-solid fa-user',
  'fa-solid fa-user',
  'fa-solid fa-user-tie',
  'fa-solid fa-user-tie',
  'fa-solid fa-user-doctor',
  'fa-solid fa-user-doctor',
  'fa-solid fa-user-ninja',
  'fa-solid fa-user-ninja'
];

// ── Calculate churn score (0–100) ──
export function calcScore(c) {
  let score = 0;
  // last login: higher = worse
  if (c.lastLogin > 60)      score += 30;
  else if (c.lastLogin > 30) score += 18;
  else if (c.lastLogin > 14) score += 8;

  // tickets: higher = worse
  if (c.tickets >= 10)      score += 25;
  else if (c.tickets >= 5)  score += 15;
  else if (c.tickets >= 2)  score += 7;

  // adoption: lower = worse
  if (c.adoption < 30)      score += 20;
  else if (c.adoption < 50) score += 12;
  else if (c.adoption < 65) score += 6;

  // contract monthly = higher risk
  if (c.contract === 'Monthly') score += 8;

  // tenure short = higher risk
  if (c.tenure < 15)      score += 10;
  else if (c.tenure < 25) score += 5;

  // usage low = worse
  if (c.usage < 10)      score += 12;
  else if (c.usage < 20) score += 6;

  // payment delays
  if (c.delay >= 3)      score += 8;
  else if (c.delay >= 1) score += 4;

  // NPS low
  if (c.nps <= 2) score += 6;

  return Math.min(100, score);
}

export function getRiskClass(score) {
  if (score >= 66) return { cls: 'high', label: 'Risiko Tinggi', color: '#e03d3d' };
  if (score >= 31) return { cls: 'med',  label: 'Risiko Sedang', color: '#d4a017' };
  return                 { cls: 'low',  label: 'Risiko Rendah', color: '#2da44e' };
}

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

  if (c.contract === 'Monthly') {
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
    r.push({ type: 'urgent',    icon: 'fa-solid fa-phone', title: 'Re-engagement Call Segera', desc: `Hubungi ${c.name} via telepon/email. Tanya kebutuhan & hambatan. Jadwalkan dalam 48 jam.` });
  }

  if (c.tickets >= 5) {
    r.push({ type: 'important', icon: 'fa-solid fa-wrench', title: 'Eskalasi Tiket & Personal Support', desc: 'Assign dedicated support agent. Selesaikan semua tiket yang pending dan lakukan follow-up kepuasan.' });
  }

  if (c.adoption < 55 || c.usage < 20) {
    r.push({ type: 'normal',    icon: 'fa-solid fa-book', title: 'Sesi Onboarding & Edukasi Fitur', desc: `Jadwalkan demo 1-on-1 untuk fitur-fitur yang belum dipakai. Fokus pada use case spesifik plan ${c.plan}.` });
  }

  if (c.contract === 'Monthly' && c.score >= 60) {
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

// Build enriched customers array
export const customers = rawData.map((c, i) => {
  const score = calcScore(c);
  const customer = {
    ...c,
    name: names[c.id],
    avatar: avatarEmoji[i],
    score,
  };
  // Attach recos (needs name)
  customer.recos = getRecos(customer);
  return customer;
});



export default { customers, getRiskClass, getFactors, getRecos };
