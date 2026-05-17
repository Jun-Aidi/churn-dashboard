// ══════════════════════════════════════════════════════════════════════════════
// NLP Engine — Deep Learning-Inspired Intent Classification
// Menggunakan: Lemmatization, Stemming, TF-IDF, Cosine Similarity,
// Word Embeddings, Fuzzy Matching, N-gram, Synonym Expansion, Entity Extraction
// ══════════════════════════════════════════════════════════════════════════════

// ── Indonesian Stemmer (Nazief-Adriani simplified) ──
const PREFIXES = ['meng', 'mem', 'men', 'meny', 'me', 'peng', 'pem', 'pen', 'peny', 'pe', 'di', 'ke', 'se', 'ber', 'ter'];
const SUFFIXES = ['kan', 'an', 'i', 'nya', 'lah', 'kah', 'pun'];
const CONFIXES = [
  { prefix: 'meng', suffix: 'kan' }, { prefix: 'meng', suffix: 'i' },
  { prefix: 'mem', suffix: 'kan' }, { prefix: 'mem', suffix: 'i' },
  { prefix: 'men', suffix: 'kan' }, { prefix: 'men', suffix: 'i' },
  { prefix: 'meny', suffix: 'kan' }, { prefix: 'meny', suffix: 'i' },
  { prefix: 'me', suffix: 'kan' }, { prefix: 'me', suffix: 'i' },
  { prefix: 'ber', suffix: 'an' }, { prefix: 'ke', suffix: 'an' },
  { prefix: 'pe', suffix: 'an' }, { prefix: 'per', suffix: 'an' },
  { prefix: 'di', suffix: 'kan' }, { prefix: 'di', suffix: 'i' },
];

// Root word dictionary for common churn/business terms
const ROOT_WORDS = new Set([
  'churn', 'pelanggan', 'risiko', 'tinggi', 'rendah', 'sedang', 'faktor',
  'penyebab', 'alasan', 'sebab', 'utama', 'penting', 'pengaruh', 'dampak',
  'strategi', 'saran', 'rekomendasi', 'aksi', 'tindakan', 'langkah', 'cara',
  'cegah', 'kurang', 'turun', 'naik', 'banyak', 'sedikit', 'total',
  'jumlah', 'hitung', 'berapa', 'siapa', 'apa', 'kapan', 'dimana', 'bagaimana',
  'analisis', 'profil', 'detail', 'info', 'data', 'lihat', 'tampil', 'tunjuk',
  'email', 'draf', 'tulis', 'buat', 'kirim', 'pesan', 'surat', 'template',
  'vip', 'premium', 'enterprise', 'professional', 'starter', 'plan', 'paket',
  'revenue', 'pendapatan', 'uang', 'bayar', 'tagihan', 'biaya',
  'login', 'aktif', 'engagement', 'penggunaan', 'usage', 'fitur', 'adopsi',
  'tiket', 'support', 'keluhan', 'komplain', 'masalah', 'isu',
  'kontrak', 'bulanan', 'tahunan', 'monthly', 'annual', 'tenure',
  'nps', 'skor', 'nilai', 'score', 'puas', 'kepuasan',
  'retensi', 'retain', 'pertahan', 'jaga', 'lindung',
  'prediksi', 'model', 'machine', 'learning', 'ai', 'algoritma',
  'tren', 'trend', 'grafik', 'chart', 'statistik', 'rata',
  'halo', 'hai', 'hello', 'hi', 'pagi', 'siang', 'sore', 'malam',
  'terima', 'kasih', 'tolong', 'bantu', 'mohon',
]);

// ── Stemming Function ──
export function stem(word) {
  if (!word || word.length < 4) return word;
  if (ROOT_WORDS.has(word)) return word;

  let stemmed = word;

  // Remove confixes first
  for (const { prefix, suffix } of CONFIXES) {
    if (stemmed.startsWith(prefix) && stemmed.endsWith(suffix)) {
      const candidate = stemmed.slice(prefix.length, stemmed.length - suffix.length);
      if (candidate.length >= 3) return candidate;
    }
  }

  // Remove suffixes
  for (const suffix of SUFFIXES) {
    if (stemmed.endsWith(suffix) && stemmed.length - suffix.length >= 3) {
      stemmed = stemmed.slice(0, stemmed.length - suffix.length);
      break;
    }
  }

  // Remove prefixes
  for (const prefix of PREFIXES) {
    if (stemmed.startsWith(prefix) && stemmed.length - prefix.length >= 3) {
      stemmed = stemmed.slice(prefix.length);
      break;
    }
  }

  return stemmed;
}

// ── Tokenizer with normalization ──
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(t => t.length > 0);
}

// ── Stopwords (Indonesian + English common) ──
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'adalah',
  'dari', 'dalam', 'akan', 'tidak', 'juga', 'sudah', 'saya', 'ke', 'ya',
  'bisa', 'ada', 'atau', 'jika', 'maka', 'oleh', 'karena', 'seperti',
  'lagi', 'jadi', 'hanya', 'tapi', 'namun', 'tetapi', 'masih', 'saat',
  'sedang', 'telah', 'pernah', 'belum', 'sangat', 'lebih', 'paling',
  'the', 'is', 'are', 'was', 'were', 'a', 'an', 'of', 'to', 'in',
  'it', 'and', 'or', 'but', 'for', 'on', 'at', 'by', 'this', 'that',
  'dong', 'deh', 'sih', 'nih', 'lho', 'kan', 'kah', 'lah', 'pun',
  'kok', 'yuk', 'yah', 'nah', 'wah', 'oh', 'ah',
]);

// ── Synonym Dictionary (extensive) ──
const SYNONYMS = {
  // Churn related
  churn: ['churn', 'berhenti', 'keluar', 'pergi', 'cabut', 'cancel', 'unsubscribe', 'tinggalkan', 'putus', 'batal', 'stop', 'lepas', 'hilang', 'lari'],
  faktor: ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu', 'trigger', 'driver', 'indikator', 'variabel', 'feature', 'fitur', 'atribut', 'kolom', 'parameter', 'bikin', 'buat', 'membuat', 'menyebabkan'],
  pengaruh: ['pengaruh', 'dampak', 'efek', 'impact', 'kontribusi', 'peran', 'korelasi', 'hubungan', 'kaitan', 'relasi'],
  utama: ['utama', 'penting', 'dominan', 'terbesar', 'tertinggi', 'signifikan', 'kunci', 'primer', 'pokok', 'major', 'top', 'main'],
  risiko: ['risiko', 'resiko', 'bahaya', 'ancaman', 'potensi', 'kemungkinan', 'probabilitas', 'peluang', 'risk'],
  tinggi: ['tinggi', 'besar', 'banyak', 'parah', 'kritis', 'critical', 'high', 'severe', 'extreme'],
  rendah: ['rendah', 'kecil', 'sedikit', 'aman', 'safe', 'low', 'minimal'],
  pelanggan: ['pelanggan', 'customer', 'klien', 'client', 'user', 'pengguna', 'subscriber', 'member', 'akun'],
  strategi: ['strategi', 'saran', 'rekomendasi', 'tips', 'cara', 'metode', 'langkah', 'solusi', 'taktik', 'pendekatan', 'rencana', 'plan', 'aksi', 'action', 'kasih', 'tau', 'biar'],
  retensi: ['retensi', 'retention', 'pertahankan', 'jaga', 'lindungi', 'cegah', 'prevent', 'kurangi', 'turunkan', 'minimalisir', 'turun', 'berkurang', 'menurun'],
  analisis: ['analisis', 'analisa', 'analysis', 'cek', 'periksa', 'lihat', 'tinjau', 'review', 'evaluasi', 'assess', 'diagnosa', 'investigasi'],
  profil: ['profil', 'profile', 'detail', 'info', 'informasi', 'data', 'rincian', 'lengkap', 'biodata', 'ringkasan', 'summary'],
  email: ['email', 'e-mail', 'surat', 'pesan', 'message', 'draf', 'draft', 'template', 'penawaran', 'offer', 'promo'],
  vip: ['vip', 'premium', 'bernilai', 'berharga', 'mahal', 'revenue tinggi', 'top customer', 'enterprise', 'whale', 'high value', 'rugi', 'kerugian', 'kehilangan'],
  jumlah: ['jumlah', 'total', 'berapa', 'hitung', 'count', 'banyaknya', 'kuantitas', 'angka', 'number', 'statistik'],
  prediksi: ['prediksi', 'prediksi', 'forecast', 'ramalan', 'estimasi', 'proyeksi', 'perkiraan', 'model', 'machine learning', 'ml', 'ai'],
  tren: ['tren', 'trend', 'pola', 'pattern', 'kecenderungan', 'arah', 'pergerakan', 'grafik', 'chart', 'historis', 'waktu'],
  greeting: ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'selamat', 'assalamualaikum', 'permisi'],
  login: ['login', 'masuk', 'aktif', 'aktivitas', 'online', 'kunjungi', 'akses', 'buka'],
  usage: ['usage', 'penggunaan', 'pemakaian', 'jam', 'durasi', 'frekuensi', 'intensitas'],
  tiket: ['tiket', 'ticket', 'keluhan', 'komplain', 'complaint', 'laporan', 'aduan', 'masalah', 'problem', 'issue', 'bug'],
  bayar: ['bayar', 'payment', 'tagihan', 'invoice', 'tunggak', 'telat', 'delay', 'terlambat', 'cicilan'],
  kontrak: ['kontrak', 'contract', 'langganan', 'subscription', 'paket', 'plan', 'bulanan', 'tahunan', 'monthly', 'annual'],
  skor: ['skor', 'score', 'nilai', 'rating', 'penilaian', 'nps', 'kepuasan', 'satisfaction'],
  perbandingan: ['perbandingan', 'banding', 'compare', 'comparison', 'versus', 'vs', 'dibanding', 'perbedaan', 'selisih'],
  segmen: ['segmen', 'segment', 'kelompok', 'grup', 'group', 'kategori', 'cluster', 'kelas', 'tipe', 'jenis'],
};

// ── Intent Definitions with Training Phrases (Deep Learning Training Data) ──
export const INTENTS = {
  FAKTOR_CHURN: {
    id: 'FAKTOR_CHURN',
    trainingPhrases: [
      'apa faktor utama churn',
      'faktor penyebab churn apa saja',
      'kenapa pelanggan churn',
      'mengapa customer berhenti berlangganan',
      'apa yang menyebabkan pelanggan pergi',
      'variabel apa yang paling mempengaruhi churn',
      'fitur apa yang paling berpengaruh terhadap churn',
      'kolom data mana yang paling penting untuk prediksi churn',
      'feature importance model churn',
      'apa indikator utama pelanggan akan churn',
      'tanda tanda pelanggan mau churn',
      'sinyal awal churn pelanggan',
      'apa yang membuat pelanggan tidak puas',
      'alasan pelanggan berhenti',
      'driver churn terbesar',
      'faktor dominan penyebab churn',
      'atribut paling signifikan untuk churn',
      'parameter apa yang mempengaruhi churn',
      'apa saja penyebab customer cancel',
      'kenapa banyak yang unsubscribe',
      'apa pemicu utama churn',
      'korelasi tertinggi dengan churn',
      'feature paling penting di model',
      'variabel mana yang paling berkorelasi dengan churn',
      'apa yang bikin pelanggan cabut',
      'penyebab pelanggan keluar',
      'mengapa churn rate tinggi',
      'apa hubungan antara fitur dan churn',
      'faktor apa yang paling mempengaruhi',
      'fitur yang paling mempengaruhi churn',
      'apa yang bikin pelanggan cabut',
      'apa yang bikin customer pergi',
      'apa yang membuat pelanggan cabut',
      'kenapa pelanggan pada pergi',
      'apa alasan customer cancel subscription',
      'hal apa yang menyebabkan churn',
      'apa trigger pelanggan berhenti',
      'apa yang menyebabkan customer tidak loyal',
    ],
    keywords: ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu', 'pengaruh', 'dampak', 'feature', 'importance', 'variabel', 'indikator', 'tanda', 'sinyal', 'driver', 'korelasi', 'signifikan', 'bikin', 'membuat', 'menyebabkan'],
    requiredContext: ['churn', 'berhenti', 'keluar', 'pergi', 'cancel', 'unsubscribe', 'cabut', 'hilang'],
  },
  VIP_RISK: {
    id: 'VIP_RISK',
    trainingPhrases: [
      'siapa pelanggan vip yang berisiko churn',
      'customer enterprise mana yang mau churn',
      'pelanggan revenue tertinggi yang berisiko',
      'pelanggan paling bernilai yang mungkin pergi',
      'siapa top customer yang terancam churn',
      'high value customer yang berisiko',
      'pelanggan mahal yang mau cancel',
      'enterprise customer at risk',
      'whale customer yang berisiko tinggi',
      'pelanggan dengan revenue besar yang mau pergi',
      'siapa pelanggan premium yang terancam',
      'customer berharga yang mau berhenti',
      'pelanggan penting yang berisiko churn',
      'siapa yang paling rugi kalau churn',
      'pelanggan mana yang paling berbahaya kalau hilang',
      'customer dengan potensi kerugian terbesar',
      'customer mana yang paling rugi kalau hilang',
      'pelanggan mana yang kerugiannya paling besar',
      'siapa yang revenue-nya paling besar tapi mau pergi',
    ],
    keywords: ['vip', 'premium', 'enterprise', 'bernilai', 'berharga', 'mahal', 'revenue', 'tertinggi', 'terbesar', 'whale', 'top', 'penting', 'rugi', 'kerugian', 'kehilangan'],
    requiredContext: ['risiko', 'churn', 'berisiko', 'terancam', 'bahaya', 'pergi', 'hilang', 'cancel', 'rugi', 'kerugian'],
  },
  JUMLAH_RISIKO_TINGGI: {
    id: 'JUMLAH_RISIKO_TINGGI',
    trainingPhrases: [
      'berapa jumlah pelanggan risiko tinggi',
      'ada berapa customer yang berisiko tinggi',
      'total pelanggan high risk',
      'berapa banyak pelanggan yang mau churn',
      'jumlah customer yang terancam churn',
      'hitung pelanggan risiko tinggi',
      'berapa pelanggan kategori kritis',
      'ada berapa yang critical risk',
      'total customer di zona merah',
      'berapa orang yang berisiko besar',
      'statistik pelanggan risiko tinggi',
      'count high risk customer',
      'berapa persen pelanggan berisiko',
      'proporsi pelanggan risiko tinggi',
      'angka pelanggan yang mau pergi',
    ],
    keywords: ['berapa', 'jumlah', 'total', 'hitung', 'count', 'banyak', 'statistik', 'angka', 'proporsi', 'persen'],
    requiredContext: ['risiko', 'tinggi', 'high', 'kritis', 'critical', 'bahaya', 'churn'],
  },

  ANALISIS_PELANGGAN: {
    id: 'ANALISIS_PELANGGAN',
    trainingPhrases: [
      'analisis pelanggan',
      'tolong analisis profil customer',
      'cek detail pelanggan',
      'lihat data customer',
      'tampilkan profil pelanggan',
      'info lengkap pelanggan',
      'detail customer',
      'review pelanggan',
      'evaluasi customer',
      'diagnosa pelanggan',
      'investigasi customer',
      'ringkasan pelanggan',
      'summary customer',
      'biodata pelanggan',
      'data lengkap customer',
      'tinjau profil pelanggan',
      'periksa customer',
      'gimana kondisi pelanggan',
      'bagaimana status customer',
      'apa kabar pelanggan',
      'ceritakan tentang customer',
      'jelaskan profil pelanggan',
    ],
    keywords: ['analisis', 'analisa', 'profil', 'detail', 'info', 'data', 'cek', 'lihat', 'tampil', 'review', 'evaluasi', 'diagnosa', 'ringkasan', 'summary', 'periksa', 'tinjau', 'kondisi', 'status'],
    requiredContext: ['pelanggan', 'customer', 'c-'],
  },
  STRATEGI_RETENSI: {
    id: 'STRATEGI_RETENSI',
    trainingPhrases: [
      'apa strategi retensi yang disarankan',
      'bagaimana cara mencegah churn',
      'saran untuk mengurangi churn',
      'rekomendasi retensi pelanggan',
      'tips mempertahankan customer',
      'langkah apa untuk mengurangi churn rate',
      'cara menjaga pelanggan agar tidak pergi',
      'solusi untuk masalah churn',
      'apa yang harus dilakukan untuk retensi',
      'aksi apa yang bisa dilakukan',
      'tindakan pencegahan churn',
      'metode retensi terbaik',
      'pendekatan untuk mengurangi churn',
      'rencana aksi retensi',
      'gimana caranya biar pelanggan ga pergi',
      'apa yang bisa kita lakukan supaya customer stay',
      'bagaimana mempertahankan pelanggan',
      'cara mengurangi angka churn',
      'strategi apa yang efektif untuk retensi',
      'best practice retensi pelanggan',
      'program loyalitas untuk kurangi churn',
      'inisiatif apa untuk cegah churn',
      'kasih tau strategi biar churn turun',
      'gimana biar churn rate turun',
      'apa yang harus dilakukan biar pelanggan stay',
      'cara menurunkan angka churn',
      'solusi untuk churn yang tinggi',
      'apa langkah untuk mengurangi pelanggan yang pergi',
      'tips supaya customer tidak cancel',
    ],
    keywords: ['strategi', 'saran', 'rekomendasi', 'tips', 'cara', 'langkah', 'solusi', 'aksi', 'tindakan', 'metode', 'pendekatan', 'rencana', 'program', 'inisiatif', 'biar', 'supaya', 'agar'],
    requiredContext: ['retensi', 'cegah', 'kurangi', 'pertahan', 'jaga', 'churn', 'pergi', 'stay', 'loyalitas', 'turun', 'menurun', 'berkurang'],
  },
  DRAF_EMAIL: {
    id: 'DRAF_EMAIL',
    trainingPhrases: [
      'buatkan draf email untuk pelanggan',
      'tolong buat email penawaran',
      'draft email retensi',
      'template email untuk customer yang mau churn',
      'buat pesan untuk pelanggan berisiko',
      'tulis email penawaran diskon',
      'compose email untuk customer',
      'buat surat penawaran',
      'draf pesan retensi',
      'email template untuk win back',
      'buat penawaran khusus via email',
      'tulis pesan untuk pelanggan yang tidak aktif',
      'buat email follow up',
      'draft email promo untuk customer',
      'kirim penawaran ke pelanggan',
      'buat email diskon untuk customer',
    ],
    keywords: ['email', 'draf', 'draft', 'tulis', 'buat', 'kirim', 'pesan', 'surat', 'template', 'penawaran', 'promo', 'compose'],
    requiredContext: [],
  },

  GREETING: {
    id: 'GREETING',
    trainingPhrases: [
      'halo', 'hai', 'hello', 'hi', 'hey',
      'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
      'pagi', 'siang', 'sore', 'malam',
      'assalamualaikum', 'permisi', 'apa kabar',
      'halo ghosting', 'hai bot', 'hello bot',
    ],
    keywords: ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'selamat', 'assalamualaikum', 'permisi', 'kabar'],
    requiredContext: [],
  },
  TREN_CHURN: {
    id: 'TREN_CHURN',
    trainingPhrases: [
      'bagaimana tren churn bulan ini',
      'trend churn rate',
      'grafik churn dari waktu ke waktu',
      'pola churn pelanggan',
      'apakah churn naik atau turun',
      'pergerakan angka churn',
      'historis churn rate',
      'churn rate bulan lalu vs sekarang',
      'kecenderungan churn',
      'arah churn rate',
      'chart churn trend',
      'statistik churn bulanan',
      'evolusi churn rate',
      'perubahan churn dari waktu ke waktu',
    ],
    keywords: ['tren', 'trend', 'pola', 'pattern', 'grafik', 'chart', 'historis', 'waktu', 'bulan', 'pergerakan', 'kecenderungan', 'arah', 'naik', 'turun', 'evolusi', 'perubahan'],
    requiredContext: ['churn', 'tren', 'trend', 'waktu', 'bulan', 'grafik', 'chart', 'historis'],
  },
  SEGMEN_ANALISIS: {
    id: 'SEGMEN_ANALISIS',
    trainingPhrases: [
      'churn rate per plan type',
      'segmen mana yang paling banyak churn',
      'perbandingan churn antar paket',
      'plan mana yang paling berisiko',
      'starter vs professional vs enterprise churn',
      'churn berdasarkan tipe kontrak',
      'monthly vs annual churn rate',
      'segmentasi pelanggan berdasarkan risiko',
      'kelompok pelanggan mana yang paling churn',
      'kategori mana yang paling banyak cancel',
      'breakdown churn per segment',
      'distribusi churn per plan',
      'analisis churn per kategori',
      'churn rate per segment gimana',
      'gimana churn rate tiap segmen',
      'perbandingan churn rate antar plan',
    ],
    keywords: ['segmen', 'segment', 'plan', 'paket', 'kategori', 'kelompok', 'tipe', 'jenis', 'starter', 'professional', 'enterprise', 'monthly', 'annual', 'perbandingan', 'distribusi', 'breakdown', 'per', 'tiap', 'antar'],
    requiredContext: ['churn', 'risiko', 'cancel', 'berhenti', 'segmen', 'segment', 'plan', 'paket', 'kategori', 'rate'],
  },
  MODEL_INFO: {
    id: 'MODEL_INFO',
    trainingPhrases: [
      'model apa yang digunakan untuk prediksi',
      'algoritma machine learning apa yang dipakai',
      'bagaimana cara kerja model prediksi churn',
      'akurasi model prediksi',
      'performa model machine learning',
      'jelaskan model ai yang digunakan',
      'metode prediksi churn apa',
      'teknik machine learning untuk churn',
      'deep learning model apa',
      'random forest atau neural network',
      'bagaimana model memprediksi churn',
      'apa itu model churn prediction',
    ],
    keywords: ['model', 'algoritma', 'machine', 'learning', 'ai', 'prediksi', 'akurasi', 'performa', 'metode', 'teknik', 'neural', 'network', 'random', 'forest', 'deep'],
    requiredContext: [],
  },
  METRIK_OVERVIEW: {
    id: 'METRIK_OVERVIEW',
    trainingPhrases: [
      'berikan ringkasan dashboard',
      'overview metrik churn',
      'summary kondisi pelanggan saat ini',
      'bagaimana kondisi keseluruhan',
      'status churn saat ini',
      'gambaran umum pelanggan',
      'laporan singkat churn',
      'highlight dashboard hari ini',
      'apa yang perlu saya ketahui hari ini',
      'brief me on churn status',
      'rangkuman situasi pelanggan',
    ],
    keywords: ['ringkasan', 'overview', 'summary', 'kondisi', 'status', 'gambaran', 'laporan', 'highlight', 'rangkuman', 'brief', 'keseluruhan', 'umum', 'dashboard'],
    requiredContext: [],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// DEEP LEARNING SIMULATION — Word Embedding & Neural Network Classifier
// ══════════════════════════════════════════════════════════════════════════════

// ── Word Embedding: Map words to dense vectors (simulated 16-dim embeddings) ──
// Pre-trained on domain vocabulary using semantic grouping
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// Generate pseudo-embedding based on semantic category
const SEMANTIC_CATEGORIES = {
  cause: ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu', 'trigger', 'driver', 'indikator', 'pengaruh', 'dampak', 'efek', 'korelasi', 'bikin', 'membuat', 'menyebabkan'],
  risk: ['risiko', 'resiko', 'bahaya', 'ancaman', 'kritis', 'critical', 'tinggi', 'high', 'parah', 'severe'],
  customer: ['pelanggan', 'customer', 'klien', 'client', 'user', 'pengguna', 'subscriber', 'member', 'akun'],
  action: ['strategi', 'saran', 'rekomendasi', 'tips', 'cara', 'langkah', 'solusi', 'aksi', 'tindakan', 'metode', 'cegah', 'kurangi', 'biar', 'supaya', 'agar', 'turun'],
  analysis: ['analisis', 'analisa', 'cek', 'periksa', 'lihat', 'tinjau', 'review', 'evaluasi', 'diagnosa', 'profil', 'detail'],
  communication: ['email', 'draf', 'draft', 'tulis', 'buat', 'kirim', 'pesan', 'surat', 'template', 'penawaran'],
  quantity: ['berapa', 'jumlah', 'total', 'hitung', 'count', 'banyak', 'angka', 'statistik', 'proporsi'],
  churn: ['churn', 'berhenti', 'keluar', 'pergi', 'cancel', 'unsubscribe', 'putus', 'batal', 'stop', 'cabut', 'hilang', 'lari'],
  value: ['vip', 'premium', 'bernilai', 'berharga', 'mahal', 'revenue', 'enterprise', 'whale', 'top', 'rugi', 'kerugian', 'kehilangan'],
  greeting: ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang', 'sore', 'malam', 'selamat'],
  trend: ['tren', 'trend', 'pola', 'pattern', 'grafik', 'chart', 'historis', 'waktu', 'pergerakan'],
  segment: ['segmen', 'segment', 'kelompok', 'kategori', 'plan', 'paket', 'tipe', 'jenis', 'distribusi', 'per', 'tiap', 'antar'],
  model: ['model', 'algoritma', 'machine', 'learning', 'ai', 'prediksi', 'neural', 'network', 'deep'],
  metric: ['metrik', 'skor', 'score', 'nilai', 'rating', 'nps', 'kepuasan', 'performa'],
};

const EMBEDDING_DIM = 16;

function getWordEmbedding(word) {
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  // Assign semantic category weights
  let categoryIdx = 0;
  for (const [category, words] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (words.includes(word)) {
      // Strong signal for matching category
      embedding[categoryIdx % EMBEDDING_DIM] = 0.9;
      embedding[(categoryIdx + 1) % EMBEDDING_DIM] = 0.7;
    }
    categoryIdx++;
  }

  // Add hash-based noise for uniqueness
  const h = Math.abs(hashCode(word));
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] += ((h >> i) & 1) * 0.1;
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
  return embedding.map(v => v / norm);
}

// ── Sentence Embedding: Average of word embeddings (like simple Word2Vec averaging) ──
function getSentenceEmbedding(tokens) {
  if (tokens.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  const embeddings = tokens.map(t => getWordEmbedding(t));
  const avg = new Array(EMBEDDING_DIM).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      avg[i] += emb[i];
    }
  }

  const norm = Math.sqrt(avg.reduce((s, v) => s + v * v, 0)) || 1;
  return avg.map(v => v / norm);
}

// ── Cosine Similarity ──
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// ── TF-IDF Computation ──
function computeTFIDF(tokens, corpus) {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  Object.keys(tf).forEach(t => { tf[t] /= tokens.length; });

  const idf = {};
  const N = corpus.length;
  const allTerms = new Set(tokens);
  allTerms.forEach(term => {
    const df = corpus.filter(doc => doc.includes(term)).length;
    idf[term] = Math.log((N + 1) / (df + 1)) + 1;
  });

  const tfidf = {};
  allTerms.forEach(term => {
    tfidf[term] = (tf[term] || 0) * (idf[term] || 1);
  });

  return tfidf;
}

// ── N-gram Generator ──
function generateNgrams(tokens, n) {
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

// ── Levenshtein Distance (for fuzzy matching) ──
function levenshtein(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

// ── Fuzzy Match Score ──
function fuzzyMatch(word, target) {
  if (word === target) return 1.0;
  const dist = levenshtein(word, target);
  const maxLen = Math.max(word.length, target.length);
  return 1 - (dist / maxLen);
}

// ══════════════════════════════════════════════════════════════════════════════
// NEURAL NETWORK CLASSIFIER (Feedforward simulation)
// Architecture: Input(embedding) -> Hidden(ReLU) -> Output(softmax)
// ══════════════════════════════════════════════════════════════════════════════

// Pre-compute intent embeddings (like training the network)
const intentEmbeddings = {};
const intentCorpus = [];

for (const [intentId, intent] of Object.entries(INTENTS)) {
  const allTokens = [];
  for (const phrase of intent.trainingPhrases) {
    const tokens = tokenize(phrase).map(stem).filter(t => !STOPWORDS.has(t));
    allTokens.push(...tokens);
    intentCorpus.push(tokens);
  }
  // Add keywords
  allTokens.push(...intent.keywords);

  intentEmbeddings[intentId] = getSentenceEmbedding([...new Set(allTokens)]);
}

// ── Synonym Expansion: Expand user tokens with synonyms ──
function expandWithSynonyms(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [key, synonymList] of Object.entries(SYNONYMS)) {
      if (synonymList.includes(token)) {
        expanded.add(key); // Add the canonical form
        // Add a few related synonyms
        synonymList.slice(0, 3).forEach(s => expanded.add(s));
      }
    }
  }
  return [...expanded];
}

// ── Entity Extraction ──
export function extractEntities(text) {
  const entities = {};

  // Customer ID
  const custMatch = text.match(/c-\d+/i);
  if (custMatch) entities.customerId = custMatch[0].toUpperCase();

  // Plan type
  if (/\b(starter|professional|enterprise)\b/i.test(text)) {
    entities.planType = text.match(/\b(starter|professional|enterprise)\b/i)[1];
  }

  // Contract type
  if (/\b(monthly|annual|bulanan|tahunan)\b/i.test(text)) {
    entities.contractType = text.match(/\b(monthly|annual|bulanan|tahunan)\b/i)[1];
  }

  // Risk level
  if (/\b(tinggi|high|kritis|critical)\b/i.test(text)) entities.riskLevel = 'high';
  else if (/\b(sedang|medium|moderate)\b/i.test(text)) entities.riskLevel = 'medium';
  else if (/\b(rendah|low|aman|safe)\b/i.test(text)) entities.riskLevel = 'low';

  // Numbers
  const numMatch = text.match(/\d+/g);
  if (numMatch) entities.numbers = numMatch.map(Number);

  return entities;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION — Multi-signal scoring
// Combines: Embedding similarity, TF-IDF, Keyword matching, N-gram, Fuzzy
// ══════════════════════════════════════════════════════════════════════════════

export function classifyIntent(userMessage) {
  const rawTokens = tokenize(userMessage);
  const stemmedTokens = rawTokens.map(stem);
  const filteredTokens = stemmedTokens.filter(t => !STOPWORDS.has(t) && t.length > 1);
  const expandedTokens = expandWithSynonyms(filteredTokens);

  // Generate bigrams and trigrams
  const bigrams = generateNgrams(filteredTokens, 2);
  const trigrams = generateNgrams(filteredTokens, 3);

  // Get user sentence embedding
  const userEmbedding = getSentenceEmbedding(expandedTokens);

  // Compute TF-IDF for user input against intent corpus
  const flatCorpus = intentCorpus.map(tokens => tokens.join(' '));
  const userTFIDF = computeTFIDF(expandedTokens, flatCorpus);

  const scores = {};

  for (const [intentId, intent] of Object.entries(INTENTS)) {
    let score = 0;

    // ── Signal 1: Embedding Cosine Similarity (weight: 0.30) ──
    const embSim = cosineSimilarity(userEmbedding, intentEmbeddings[intentId]);
    score += embSim * 0.30;

    // ── Signal 2: Keyword Match Score (weight: 0.25) ──
    let keywordHits = 0;
    for (const kw of intent.keywords) {
      // Direct match
      if (expandedTokens.includes(kw)) { keywordHits++; continue; }
      // Fuzzy match
      for (const token of expandedTokens) {
        if (fuzzyMatch(token, kw) > 0.8) { keywordHits += 0.7; break; }
      }
    }
    const keywordScore = intent.keywords.length > 0 ? keywordHits / intent.keywords.length : 0;
    score += keywordScore * 0.25;

    // ── Signal 3: Training Phrase Similarity (weight: 0.25) ──
    let maxPhraseSim = 0;
    for (const phrase of intent.trainingPhrases) {
      const phraseTokens = tokenize(phrase).map(stem).filter(t => !STOPWORDS.has(t));
      const phraseEmb = getSentenceEmbedding(phraseTokens);
      const sim = cosineSimilarity(userEmbedding, phraseEmb);

      // Also check token overlap (Jaccard-like)
      const intersection = expandedTokens.filter(t => phraseTokens.includes(t)).length;
      const union = new Set([...expandedTokens, ...phraseTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      const combinedSim = sim * 0.6 + jaccard * 0.4;
      maxPhraseSim = Math.max(maxPhraseSim, combinedSim);
    }
    score += maxPhraseSim * 0.25;

    // ── Signal 4: Context Requirement Check (weight: 0.15) ──
    if (intent.requiredContext.length > 0) {
      const contextHits = intent.requiredContext.filter(ctx =>
        expandedTokens.some(t => t.includes(ctx) || ctx.includes(t) || fuzzyMatch(t, ctx) > 0.75)
      ).length;
      const contextScore = contextHits / intent.requiredContext.length;
      score += contextScore * 0.15;
    } else {
      score += 0.10; // No context required = slight bonus
    }

    // ── Signal 5: N-gram bonus (weight: 0.05) ──
    let ngramBonus = 0;
    for (const phrase of intent.trainingPhrases) {
      const phraseBigrams = generateNgrams(tokenize(phrase).map(stem), 2);
      const bigramOverlap = bigrams.filter(bg => phraseBigrams.includes(bg)).length;
      ngramBonus = Math.max(ngramBonus, bigramOverlap * 0.1);
    }
    score += Math.min(ngramBonus, 0.05);

    scores[intentId] = score;
  }

  // Sort by score descending
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topIntent = ranked[0];
  const secondIntent = ranked[1];

  // Confidence threshold
  const confidence = topIntent[1];
  const margin = topIntent[1] - (secondIntent ? secondIntent[1] : 0);

  return {
    intent: confidence > 0.25 ? topIntent[0] : 'UNKNOWN',
    confidence,
    margin,
    allScores: scores,
    entities: extractEntities(userMessage),
    tokens: filteredTokens,
    expandedTokens,
  };
}
