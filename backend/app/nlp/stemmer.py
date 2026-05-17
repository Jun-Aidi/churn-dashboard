"""
Indonesian Stemmer — Nazief-Adriani Algorithm (simplified).
Menggunakan library Sastrawi jika tersedia, fallback ke implementasi manual.
"""

try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _factory = StemmerFactory()
    # Support both old and new API
    if hasattr(_factory, 'createStemmer'):
        _sastrawi = _factory.createStemmer()
    else:
        _sastrawi = _factory.create_stemmer()
    USE_SASTRAWI = True
except (ImportError, Exception):
    USE_SASTRAWI = False

# Fallback manual stemmer
PREFIXES = ['meng', 'mem', 'men', 'meny', 'me', 'peng', 'pem', 'pen',
            'peny', 'pe', 'di', 'ke', 'se', 'ber', 'ter']
SUFFIXES = ['kan', 'an', 'i', 'nya', 'lah', 'kah', 'pun']
CONFIXES = [
    ('meng', 'kan'), ('meng', 'i'), ('mem', 'kan'), ('mem', 'i'),
    ('men', 'kan'), ('men', 'i'), ('meny', 'kan'), ('meny', 'i'),
    ('me', 'kan'), ('me', 'i'), ('ber', 'an'), ('ke', 'an'),
    ('pe', 'an'), ('per', 'an'), ('di', 'kan'), ('di', 'i'),
]


def _manual_stem(word: str) -> str:
    if len(word) < 4:
        return word

    stemmed = word

    # Remove confixes
    for prefix, suffix in CONFIXES:
        if stemmed.startswith(prefix) and stemmed.endswith(suffix):
            candidate = stemmed[len(prefix):-len(suffix)]
            if len(candidate) >= 3:
                return candidate

    # Remove suffixes
    for suffix in SUFFIXES:
        if stemmed.endswith(suffix) and len(stemmed) - len(suffix) >= 3:
            stemmed = stemmed[:-len(suffix)]
            break

    # Remove prefixes
    for prefix in PREFIXES:
        if stemmed.startswith(prefix) and len(stemmed) - len(prefix) >= 3:
            stemmed = stemmed[len(prefix):]
            break

    return stemmed


def stem(word: str) -> str:
    """Stem kata Bahasa Indonesia."""
    if USE_SASTRAWI:
        return _sastrawi.stem(word)
    return _manual_stem(word)
