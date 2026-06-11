// ══════════════════════════════════════════
// API Layer — Fetches data from Flask backend
// ══════════════════════════════════════════

// Default = path relatif (/api/...) untuk PRODUKSI (Pola B, same-origin).
// localhost hanya dipakai saat development via .env.development (npm run dev).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Auth interceptor: attaches Bearer token and handles 401 ──
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return res;
  }

  return res;
}

// ── Risk classification (shared utility) ──
export function getRiskClass(score) {
  if (score >= 66) return { cls: 'high', label: 'Risiko Tinggi', color: '#e03d3d' };
  if (score >= 31) return { cls: 'med',  label: 'Risiko Sedang', color: '#d4a017' };
  return                 { cls: 'low',  label: 'Risiko Rendah', color: '#2da44e' };
}

// ── Auth API functions ──
export async function loginApi(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login gagal');
  return data;
}

export async function logoutApi() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Logout gagal');
  }
  return res.json();
}

export async function getMeApi() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/me`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Gagal mengambil data pengguna');
  }
  return res.json();
}

export async function getUsersApi() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/users`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Gagal mengambil daftar pengguna');
  }
  return res.json();
}

export async function createUserApi(data) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Gagal membuat pengguna');
  return result;
}

export async function updateUserApi(id, data) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Gagal memperbarui pengguna');
  return result;
}

export async function deactivateUserApi(id) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/users/${id}/deactivate`, {
    method: 'POST',
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Gagal menonaktifkan pengguna');
  return result;
}

export async function activateUserApi(id) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/users/${id}/activate`, {
    method: 'POST',
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Gagal mengaktifkan pengguna');
  return result;
}

export async function getStatsApi() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/stats`);
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Gagal mengambil statistik sistem');
  }
  return res.json();
}

// ── Data API Fetch helpers (with auth) ──
export async function fetchCustomers() {
  const res = await fetchWithAuth(`${API_BASE}/api/customers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCustomer(id) {
  const res = await fetchWithAuth(`${API_BASE}/api/customers/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetchWithAuth(`${API_BASE}/api/customers/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchTrend() {
  const res = await fetchWithAuth(`${API_BASE}/api/trend`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchFeatureImportance() {
  const res = await fetchWithAuth(`${API_BASE}/api/feature-importance`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPredict(formData) {
  const res = await fetchWithAuth(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Manual add customer (all feature values), scoped to current user ──
export async function createCustomer(data) {
  const res = await fetchWithAuth(`${API_BASE}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
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

export default {
  fetchWithAuth,
  getRiskClass,
  getFactors,
  getRecos,
  fetchCustomers,
  fetchCustomer,
  fetchStats,
  fetchTrend,
  fetchPredict,
  loginApi,
  logoutApi,
  getMeApi,
  getUsersApi,
  createUserApi,
  updateUserApi,
  deactivateUserApi,
  activateUserApi,
  getStatsApi,
};
