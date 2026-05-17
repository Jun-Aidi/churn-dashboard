"""
Neural Network-Inspired Intent Classifier.
Menggunakan: Word Embeddings, TF-IDF, Cosine Similarity, Fuzzy Matching.
Multi-signal scoring architecture.
"""

import math
import re
from typing import Dict, List, Tuple
from app.nlp.preprocessor import preprocess, tokenize, stem_tokens, remove_stopwords
from app.nlp.preprocessor import expand_synonyms, generate_ngrams, STOPWORDS

# ══════════════════════════════════════════════════════════════════════════════
# INTENT DEFINITIONS — Training Data
# ══════════════════════════════════════════════════════════════════════════════

INTENTS = {
    'FAKTOR_CHURN': {
        'training_phrases': [
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
            'driver churn terbesar',
            'faktor dominan penyebab churn',
            'atribut paling signifikan untuk churn',
            'parameter apa yang mempengaruhi churn',
            'apa saja penyebab customer cancel',
            'kenapa banyak yang unsubscribe',
            'apa pemicu utama churn',
            'korelasi tertinggi dengan churn',
            'feature paling penting di model',
            'apa yang bikin pelanggan cabut',
            'penyebab pelanggan keluar',
            'fitur yang paling mempengaruhi churn',
            'apa yang bikin customer pergi',
            'hal apa yang menyebabkan churn',
            'apa trigger pelanggan berhenti',
        ],
        'keywords': ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu',
                     'pengaruh', 'dampak', 'feature', 'importance', 'variabel',
                     'indikator', 'tanda', 'sinyal', 'driver', 'korelasi',
                     'signifikan', 'bikin', 'membuat', 'menyebabkan'],
        'required_context': ['churn', 'berhenti', 'keluar', 'pergi', 'cancel',
                             'unsubscribe', 'cabut', 'hilang'],
    },
    'VIP_RISK': {
        'training_phrases': [
            'siapa pelanggan vip yang berisiko churn',
            'customer enterprise mana yang mau churn',
            'pelanggan revenue tertinggi yang berisiko',
            'pelanggan paling bernilai yang mungkin pergi',
            'siapa top customer yang terancam churn',
            'high value customer yang berisiko',
            'pelanggan mahal yang mau cancel',
            'whale customer yang berisiko tinggi',
            'siapa pelanggan premium yang terancam',
            'customer berharga yang mau berhenti',
            'siapa yang paling rugi kalau churn',
            'pelanggan mana yang paling berbahaya kalau hilang',
            'customer dengan potensi kerugian terbesar',
            'customer mana yang paling rugi kalau hilang',
            'siapa yang revenue-nya paling besar tapi mau pergi',
        ],
        'keywords': ['vip', 'premium', 'enterprise', 'bernilai', 'berharga',
                     'mahal', 'revenue', 'tertinggi', 'terbesar', 'whale',
                     'top', 'penting', 'rugi', 'kerugian', 'kehilangan'],
        'required_context': ['risiko', 'churn', 'berisiko', 'terancam',
                             'bahaya', 'pergi', 'hilang', 'cancel', 'rugi',
                             'kerugian'],
    },
    'JUMLAH_RISIKO_TINGGI': {
        'training_phrases': [
            'berapa jumlah pelanggan risiko tinggi',
            'ada berapa customer yang berisiko tinggi',
            'total pelanggan high risk',
            'berapa banyak pelanggan yang mau churn',
            'jumlah customer yang terancam churn',
            'hitung pelanggan risiko tinggi',
            'berapa pelanggan kategori kritis',
            'ada berapa yang critical risk',
            'total customer di zona merah',
            'statistik pelanggan risiko tinggi',
            'count high risk customer',
            'berapa persen pelanggan berisiko',
            'angka pelanggan yang mau pergi',
        ],
        'keywords': ['berapa', 'jumlah', 'total', 'hitung', 'count', 'banyak',
                     'statistik', 'angka', 'proporsi', 'persen'],
        'required_context': ['risiko', 'tinggi', 'high', 'kritis', 'critical',
                             'bahaya', 'churn'],
    },
    'ANALISIS_PELANGGAN': {
        'training_phrases': [
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
            'ringkasan pelanggan',
            'data lengkap customer',
            'tinjau profil pelanggan',
            'periksa customer',
            'gimana kondisi pelanggan',
            'bagaimana status customer',
            'ceritakan tentang customer',
        ],
        'keywords': ['analisis', 'analisa', 'profil', 'detail', 'info', 'data',
                     'cek', 'lihat', 'tampil', 'review', 'evaluasi', 'diagnosa',
                     'ringkasan', 'summary', 'periksa', 'tinjau', 'kondisi',
                     'status'],
        'required_context': ['pelanggan', 'customer', 'c-'],
    },
    'STRATEGI_RETENSI': {
        'training_phrases': [
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
            'gimana caranya biar pelanggan ga pergi',
            'apa yang bisa kita lakukan supaya customer stay',
            'bagaimana mempertahankan pelanggan',
            'cara mengurangi angka churn',
            'kasih tau strategi biar churn turun',
            'gimana biar churn rate turun',
            'tips supaya customer tidak cancel',
            'solusi untuk churn yang tinggi',
        ],
        'keywords': ['strategi', 'saran', 'rekomendasi', 'tips', 'cara',
                     'langkah', 'solusi', 'aksi', 'tindakan', 'metode',
                     'pendekatan', 'rencana', 'program', 'inisiatif', 'biar',
                     'supaya', 'agar'],
        'required_context': ['retensi', 'cegah', 'kurangi', 'pertahan', 'jaga',
                             'churn', 'pergi', 'stay', 'loyalitas', 'turun',
                             'menurun', 'berkurang'],
    },
    'DRAF_EMAIL': {
        'training_phrases': [
            'buatkan draf email untuk pelanggan',
            'tolong buat email penawaran',
            'draft email retensi',
            'template email untuk customer yang mau churn',
            'buat pesan untuk pelanggan berisiko',
            'tulis email penawaran diskon',
            'compose email untuk customer',
            'buat surat penawaran',
            'draf pesan retensi',
            'buat penawaran khusus via email',
            'tulis pesan untuk pelanggan yang tidak aktif',
            'buat email follow up',
            'draft email promo untuk customer',
            'buat email diskon untuk customer',
        ],
        'keywords': ['email', 'draf', 'draft', 'tulis', 'buat', 'kirim',
                     'pesan', 'surat', 'template', 'penawaran', 'promo',
                     'compose'],
        'required_context': [],
    },
    'GREETING': {
        'training_phrases': [
            'halo', 'hai', 'hello', 'hi', 'hey',
            'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
            'pagi', 'siang', 'sore', 'malam',
            'assalamualaikum', 'permisi', 'apa kabar',
            'halo ghosting', 'hai bot',
        ],
        'keywords': ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang',
                     'sore', 'malam', 'selamat', 'assalamualaikum', 'permisi',
                     'kabar'],
        'required_context': [],
    },
    'TREN_CHURN': {
        'training_phrases': [
            'bagaimana tren churn bulan ini',
            'trend churn rate',
            'grafik churn dari waktu ke waktu',
            'pola churn pelanggan',
            'apakah churn naik atau turun',
            'pergerakan angka churn',
            'historis churn rate',
            'kecenderungan churn',
            'chart churn trend',
            'statistik churn bulanan',
            'evolusi churn rate',
        ],
        'keywords': ['tren', 'trend', 'pola', 'pattern', 'grafik', 'chart',
                     'historis', 'waktu', 'bulan', 'pergerakan', 'kecenderungan',
                     'arah', 'naik', 'turun', 'evolusi', 'perubahan'],
        'required_context': ['churn', 'tren', 'trend', 'waktu', 'bulan',
                             'grafik', 'chart', 'historis'],
    },
    'SEGMEN_ANALISIS': {
        'training_phrases': [
            'churn rate per plan type',
            'segmen mana yang paling banyak churn',
            'perbandingan churn antar paket',
            'plan mana yang paling berisiko',
            'starter vs professional vs enterprise churn',
            'churn berdasarkan tipe kontrak',
            'monthly vs annual churn rate',
            'segmentasi pelanggan berdasarkan risiko',
            'kelompok pelanggan mana yang paling churn',
            'breakdown churn per segment',
            'distribusi churn per plan',
            'churn rate per segment gimana',
            'perbandingan churn rate antar plan',
        ],
        'keywords': ['segmen', 'segment', 'plan', 'paket', 'kategori',
                     'kelompok', 'tipe', 'jenis', 'starter', 'professional',
                     'enterprise', 'monthly', 'annual', 'perbandingan',
                     'distribusi', 'breakdown', 'per', 'tiap', 'antar'],
        'required_context': ['churn', 'risiko', 'cancel', 'berhenti', 'segmen',
                             'segment', 'plan', 'paket', 'kategori', 'rate'],
    },
    'MODEL_INFO': {
        'training_phrases': [
            'model apa yang digunakan untuk prediksi',
            'algoritma machine learning apa yang dipakai',
            'bagaimana cara kerja model prediksi churn',
            'akurasi model prediksi',
            'performa model machine learning',
            'jelaskan model ai yang digunakan',
            'metode prediksi churn apa',
            'teknik machine learning untuk churn',
            'bagaimana model memprediksi churn',
        ],
        'keywords': ['model', 'algoritma', 'machine', 'learning', 'ai',
                     'prediksi', 'akurasi', 'performa', 'metode', 'teknik',
                     'neural', 'network', 'random', 'forest', 'deep'],
        'required_context': [],
    },
    'METRIK_OVERVIEW': {
        'training_phrases': [
            'berikan ringkasan dashboard',
            'overview metrik churn',
            'summary kondisi pelanggan saat ini',
            'bagaimana kondisi keseluruhan',
            'status churn saat ini',
            'gambaran umum pelanggan',
            'laporan singkat churn',
            'highlight dashboard hari ini',
            'apa yang perlu saya ketahui hari ini',
            'rangkuman situasi pelanggan',
        ],
        'keywords': ['ringkasan', 'overview', 'summary', 'kondisi', 'status',
                     'gambaran', 'laporan', 'highlight', 'rangkuman', 'brief',
                     'keseluruhan', 'umum', 'dashboard'],
        'required_context': [],
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# WORD EMBEDDINGS — Semantic Category-Based Dense Vectors
# ══════════════════════════════════════════════════════════════════════════════

EMBEDDING_DIM = 16

SEMANTIC_CATEGORIES = {
    'cause': ['faktor', 'penyebab', 'alasan', 'sebab', 'pemicu', 'trigger',
              'driver', 'indikator', 'pengaruh', 'dampak', 'efek', 'korelasi',
              'bikin', 'membuat', 'menyebabkan'],
    'risk': ['risiko', 'resiko', 'bahaya', 'ancaman', 'kritis', 'critical',
             'tinggi', 'high', 'parah', 'severe'],
    'customer': ['pelanggan', 'customer', 'klien', 'client', 'user',
                 'pengguna', 'subscriber', 'member', 'akun'],
    'action': ['strategi', 'saran', 'rekomendasi', 'tips', 'cara', 'langkah',
               'solusi', 'aksi', 'tindakan', 'metode', 'cegah', 'kurangi',
               'biar', 'supaya', 'agar', 'turun'],
    'analysis': ['analisis', 'analisa', 'cek', 'periksa', 'lihat', 'tinjau',
                 'review', 'evaluasi', 'diagnosa', 'profil', 'detail'],
    'communication': ['email', 'draf', 'draft', 'tulis', 'buat', 'kirim',
                      'pesan', 'surat', 'template', 'penawaran'],
    'quantity': ['berapa', 'jumlah', 'total', 'hitung', 'count', 'banyak',
                 'angka', 'statistik', 'proporsi'],
    'churn': ['churn', 'berhenti', 'keluar', 'pergi', 'cancel', 'unsubscribe',
              'putus', 'batal', 'stop', 'cabut', 'hilang', 'lari'],
    'value': ['vip', 'premium', 'bernilai', 'berharga', 'mahal', 'revenue',
              'enterprise', 'whale', 'top', 'rugi', 'kerugian', 'kehilangan'],
    'greeting': ['halo', 'hai', 'hello', 'hi', 'hey', 'pagi', 'siang',
                 'sore', 'malam', 'selamat'],
    'trend': ['tren', 'trend', 'pola', 'pattern', 'grafik', 'chart',
              'historis', 'waktu', 'pergerakan'],
    'segment': ['segmen', 'segment', 'kelompok', 'kategori', 'plan', 'paket',
                'tipe', 'jenis', 'distribusi', 'per', 'tiap', 'antar'],
    'model': ['model', 'algoritma', 'machine', 'learning', 'ai', 'prediksi',
              'neural', 'network', 'deep'],
    'metric': ['metrik', 'skor', 'score', 'nilai', 'rating', 'nps',
               'kepuasan', 'performa'],
}


def _hash_code(s: str) -> int:
    h = 0
    for ch in s:
        h = ((h << 5) - h) + ord(ch)
        h &= 0xFFFFFFFF
    return h


def get_word_embedding(word: str) -> List[float]:
    """Generate pseudo-embedding berdasarkan semantic category."""
    embedding = [0.0] * EMBEDDING_DIM

    cat_idx = 0
    for cat_words in SEMANTIC_CATEGORIES.values():
        if word in cat_words:
            embedding[cat_idx % EMBEDDING_DIM] = 0.9
            embedding[(cat_idx + 1) % EMBEDDING_DIM] = 0.7
        cat_idx += 1

    h = _hash_code(word)
    for i in range(EMBEDDING_DIM):
        embedding[i] += ((h >> i) & 1) * 0.1

    norm = math.sqrt(sum(v * v for v in embedding)) or 1.0
    return [v / norm for v in embedding]


def get_sentence_embedding(tokens: List[str]) -> List[float]:
    """Average pooling dari word embeddings."""
    if not tokens:
        return [0.0] * EMBEDDING_DIM

    embeddings = [get_word_embedding(t) for t in tokens]
    avg = [0.0] * EMBEDDING_DIM
    for emb in embeddings:
        for i in range(EMBEDDING_DIM):
            avg[i] += emb[i]

    norm = math.sqrt(sum(v * v for v in avg)) or 1.0
    return [v / norm for v in avg]


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Cosine similarity antara dua vektor."""
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a)) or 1.0
    norm_b = math.sqrt(sum(b * b for b in vec_b)) or 1.0
    return dot / (norm_a * norm_b)


def levenshtein(a: str, b: str) -> int:
    """Levenshtein distance."""
    if len(a) < len(b):
        return levenshtein(b, a)
    if len(b) == 0:
        return len(a)

    prev_row = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr_row = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr_row.append(min(curr_row[j] + 1, prev_row[j + 1] + 1,
                                prev_row[j] + cost))
        prev_row = curr_row
    return prev_row[-1]


def fuzzy_match(word: str, target: str) -> float:
    """Fuzzy match score (0-1)."""
    if word == target:
        return 1.0
    dist = levenshtein(word, target)
    max_len = max(len(word), len(target))
    return 1 - (dist / max_len) if max_len > 0 else 0.0

# ══════════════════════════════════════════════════════════════════════════════
# PRE-COMPUTE INTENT EMBEDDINGS (Training Phase)
# ══════════════════════════════════════════════════════════════════════════════

_intent_embeddings: Dict[str, List[float]] = {}
_intent_corpus: List[List[str]] = []

for _intent_id, _intent in INTENTS.items():
    all_tokens = []
    for phrase in _intent['training_phrases']:
        tokens = remove_stopwords(stem_tokens(tokenize(phrase)))
        all_tokens.extend(tokens)
        _intent_corpus.append(tokens)
    all_tokens.extend(_intent['keywords'])
    _intent_embeddings[_intent_id] = get_sentence_embedding(list(set(all_tokens)))


# ══════════════════════════════════════════════════════════════════════════════
# ENTITY EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def extract_entities(text: str) -> dict:
    """Ekstrak entitas dari teks user."""
    entities = {}

    # Customer ID
    cust_match = re.search(r'c-\d+', text, re.IGNORECASE)
    if cust_match:
        entities['customer_id'] = cust_match.group(0).upper()

    # Plan type
    plan_match = re.search(r'\b(starter|professional|enterprise)\b', text,
                           re.IGNORECASE)
    if plan_match:
        entities['plan_type'] = plan_match.group(1).capitalize()

    # Contract type
    contract_match = re.search(r'\b(monthly|annual|bulanan|tahunan)\b', text,
                               re.IGNORECASE)
    if contract_match:
        entities['contract_type'] = contract_match.group(1)

    # Risk level
    if re.search(r'\b(tinggi|high|kritis|critical)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'high'
    elif re.search(r'\b(sedang|medium|moderate)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'medium'
    elif re.search(r'\b(rendah|low|aman|safe)\b', text, re.IGNORECASE):
        entities['risk_level'] = 'low'

    return entities


# ══════════════════════════════════════════════════════════════════════════════
# MAIN CLASSIFICATION — Multi-Signal Neural Scoring
# ══════════════════════════════════════════════════════════════════════════════

def classify_intent(message: str) -> dict:
    """
    Klasifikasi intent menggunakan multi-signal scoring:
    1. Embedding Cosine Similarity (30%)
    2. Keyword Match (25%)
    3. Training Phrase Similarity (25%)
    4. Context Requirement (15%)
    5. N-gram Bonus (5%)
    """
    processed = preprocess(message)
    filtered = processed['filtered']
    expanded = processed['expanded']
    bigrams = processed['bigrams']

    user_embedding = get_sentence_embedding(expanded)

    scores = {}

    for intent_id, intent in INTENTS.items():
        score = 0.0

        # Signal 1: Embedding Cosine Similarity (0.30)
        emb_sim = cosine_similarity(user_embedding, _intent_embeddings[intent_id])
        score += emb_sim * 0.30

        # Signal 2: Keyword Match (0.25)
        keyword_hits = 0.0
        for kw in intent['keywords']:
            if kw in expanded:
                keyword_hits += 1.0
                continue
            for token in expanded:
                if fuzzy_match(token, kw) > 0.8:
                    keyword_hits += 0.7
                    break
        kw_score = keyword_hits / len(intent['keywords']) if intent['keywords'] else 0
        score += kw_score * 0.25

        # Signal 3: Training Phrase Similarity (0.25)
        max_phrase_sim = 0.0
        for phrase in intent['training_phrases']:
            phrase_tokens = remove_stopwords(stem_tokens(tokenize(phrase)))
            phrase_emb = get_sentence_embedding(phrase_tokens)
            sim = cosine_similarity(user_embedding, phrase_emb)

            # Jaccard overlap
            intersection = len(set(expanded) & set(phrase_tokens))
            union = len(set(expanded) | set(phrase_tokens))
            jaccard = intersection / union if union > 0 else 0

            combined = sim * 0.6 + jaccard * 0.4
            max_phrase_sim = max(max_phrase_sim, combined)
        score += max_phrase_sim * 0.25

        # Signal 4: Context Requirement (0.15)
        req_ctx = intent['required_context']
        if req_ctx:
            ctx_hits = sum(
                1 for ctx in req_ctx
                if any(ctx in t or t in ctx or fuzzy_match(t, ctx) > 0.75
                       for t in expanded)
            )
            ctx_score = ctx_hits / len(req_ctx)
            score += ctx_score * 0.15
        else:
            score += 0.10

        # Signal 5: N-gram Bonus (0.05)
        ngram_bonus = 0.0
        for phrase in intent['training_phrases']:
            phrase_bigrams = generate_ngrams(
                remove_stopwords(stem_tokens(tokenize(phrase))), 2)
            overlap = len(set(bigrams) & set(phrase_bigrams))
            ngram_bonus = max(ngram_bonus, overlap * 0.1)
        score += min(ngram_bonus, 0.05)

        scores[intent_id] = score

    # Rank
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_intent = ranked[0]
    confidence = top_intent[1]

    return {
        'intent': top_intent[0] if confidence > 0.25 else 'UNKNOWN',
        'confidence': confidence,
        'entities': extract_entities(message),
        'all_scores': scores,
    }
