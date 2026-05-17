"""
Text Preprocessing Pipeline:
- Tokenization & Normalization
- Stopword Removal
- Stemming (Nazief-Adriani via Sastrawi)
- Synonym Expansion
- N-gram Generation
"""

import re
from typing import List, Set
from app.nlp.stemmer import stem

# ── Stopwords (Indonesian + English common) ──
STOPWORDS: Set[str] = {
    'yang', 'dan', 'di', 'ini', 'itu', 'dengan', 'untuk', 'pada', 'adalah',
    'dari', 'dalam', 'akan', 'tidak', 'juga', 'sudah', 'saya', 'ke', 'ya',
    'bisa', 'ada', 'atau', 'jika', 'maka', 'oleh', 'karena', 'seperti',
    'lagi', 'jadi', 'hanya', 'tapi', 'namun', 'tetapi', 'masih', 'saat',
    'sedang', 'telah', 'pernah', 'belum', 'sangat', 'lebih', 'paling',
    'the', 'is', 'are', 'was', 'were', 'a', 'an', 'of', 'to', 'in',
    'it', 'and', 'or', 'but', 'for', 'on', 'at', 'by', 'this', 'that',
    'dong', 'deh', 'sih', 'nih', 'lho', 'kan', 'kah', 'lah', 'pun',
    'kok', 'yuk', 'yah', 'nah', 'wah', 'oh', 'ah',
}

# ── Synonym Dictionary ──
SYNONYMS = {
    'churn': ['churn', 'berhenti', 'keluar', 'pergi', 'cabut', 'cancel',
              'unsubscribe', 'tinggalkan', 'putus', 'batal', 'stop', 'lepas',
              'hilang', 'lari'],
    'faktor': ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu', 'trigger',
               'driver', 'indikator', 'variabel', 'feature', 'fitur', 'atribut',
               'kolom', 'parameter', 'bikin', 'buat', 'membuat', 'menyebabkan'],
    'pengaruh': ['pengaruh', 'dampak', 'efek', 'impact', 'kontribusi', 'peran',
                 'korelasi', 'hubungan', 'kaitan', 'relasi'],
    'utama': ['utama', 'penting', 'dominan', 'terbesar', 'tertinggi',
              'signifikan', 'kunci', 'primer', 'pokok', 'major', 'top', 'main'],
    'risiko': ['risiko', 'resiko', 'bahaya', 'ancaman', 'potensi',
               'kemungkinan', 'probabilitas', 'peluang', 'risk'],
    'tinggi': ['tinggi', 'besar', 'banyak', 'parah', 'kritis', 'critical',
               'high', 'severe', 'extreme'],
    'rendah': ['rendah', 'kecil', 'sedikit', 'aman', 'safe', 'low', 'minimal'],
    'pelanggan': ['pelanggan', 'customer', 'klien', 'client', 'user',
                  'pengguna', 'subscriber', 'member', 'akun'],
    'strategi': ['strategi', 'saran', 'rekomendasi', 'tips', 'cara', 'metode',
                 'langkah', 'solusi', 'taktik', 'pendekatan', 'rencana', 'plan',
                 'aksi', 'action', 'kasih', 'tau', 'biar'],
    'retensi': ['retensi', 'retention', 'pertahankan', 'jaga', 'lindungi',
                'cegah', 'prevent', 'kurangi', 'turunkan', 'minimalisir',
                'turun', 'berkurang', 'menurun'],
    'analisis': ['analisis', 'analisa', 'analysis', 'cek', 'periksa', 'lihat',
                 'tinjau', 'review', 'evaluasi', 'assess', 'diagnosa',
                 'investigasi'],
    'profil': ['profil', 'profile', 'detail', 'info', 'informasi', 'data',
               'rincian', 'lengkap', 'biodata', 'ringkasan', 'summary'],
    'email': ['email', 'e-mail', 'surat', 'pesan', 'message', 'draf', 'draft',
              'template', 'penawaran', 'offer', 'promo'],
    'vip': ['vip', 'premium', 'bernilai', 'berharga', 'mahal', 'revenue tinggi',
            'top customer', 'enterprise', 'whale', 'high value', 'rugi',
            'kerugian', 'kehilangan'],
    'jumlah': ['jumlah', 'total', 'berapa', 'hitung', 'count', 'banyaknya',
               'kuantitas', 'angka', 'number', 'statistik'],
    'prediksi': ['prediksi', 'forecast', 'ramalan', 'estimasi', 'proyeksi',
                 'perkiraan', 'model', 'machine learning', 'ml', 'ai'],
    'tren': ['tren', 'trend', 'pola', 'pattern', 'kecenderungan', 'arah',
             'pergerakan', 'grafik', 'chart', 'historis', 'waktu'],
    'greeting': ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang',
                 'sore', 'malam', 'selamat', 'assalamualaikum', 'permisi'],
    'segmen': ['segmen', 'segment', 'kelompok', 'grup', 'group', 'kategori',
               'cluster', 'kelas', 'tipe', 'jenis', 'per', 'tiap', 'antar'],
}


def tokenize(text: str) -> List[str]:
    """Tokenize dan normalisasi teks."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return [t for t in text.split(' ') if t]


def remove_stopwords(tokens: List[str]) -> List[str]:
    """Hapus stopwords."""
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


def stem_tokens(tokens: List[str]) -> List[str]:
    """Stem semua token."""
    return [stem(t) for t in tokens]


def expand_synonyms(tokens: List[str]) -> List[str]:
    """Ekspansi token dengan sinonim."""
    expanded = set(tokens)
    for token in tokens:
        for key, synonym_list in SYNONYMS.items():
            if token in synonym_list:
                expanded.add(key)
                for s in synonym_list[:3]:
                    expanded.add(s)
    return list(expanded)


def generate_ngrams(tokens: List[str], n: int) -> List[str]:
    """Generate n-grams dari token list."""
    return [' '.join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def preprocess(text: str) -> dict:
    """Full preprocessing pipeline. Returns dict with all stages."""
    raw_tokens = tokenize(text)
    stemmed = stem_tokens(raw_tokens)
    filtered = remove_stopwords(stemmed)
    expanded = expand_synonyms(filtered)
    bigrams = generate_ngrams(filtered, 2)
    trigrams = generate_ngrams(filtered, 3)

    return {
        'raw_tokens': raw_tokens,
        'stemmed': stemmed,
        'filtered': filtered,
        'expanded': expanded,
        'bigrams': bigrams,
        'trigrams': trigrams,
    }
