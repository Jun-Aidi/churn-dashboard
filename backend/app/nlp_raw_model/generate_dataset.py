"""
generate_dataset.py
-------------------
Menghasilkan intent_dataset.csv dengan ~5000 sampel per intent (55.000+ total).
Kosakata slot didasarkan pada kolom dan nilai nyata di merged_dataset.csv:
  - plan_type    : starter | professional | enterprise
  - contract_type: monthly | annual
  - customer_id  : C-XXXX
  - kolom metrik : tenure_days, churn_probability, nps, ticket_count, dsb.
"""
import csv, random, itertools
from pathlib import Path
from collections import Counter

OUTPUT = Path(__file__).parent / "intent_dataset.csv"
TARGET = 5000
SEED   = 42
random.seed(SEED)

# ── helper ────────────────────────────────────────────────────────────────────
def expand(templates: list, slots: dict) -> list:
    results = []
    for tmpl in templates:
        keys = [k for k in slots if f"{{{k}}}" in tmpl]
        if not keys:
            results.append(tmpl)
            continue
        for combo in itertools.product(*[slots[k] for k in keys]):
            s = tmpl
            for k, v in zip(keys, combo):
                s = s.replace(f"{{{k}}}", v)
            results.append(s)
    return results

def balance(samples: list, target: int) -> list:
    unique = list(dict.fromkeys(s.strip() for s in samples))
    if len(unique) >= target:
        return random.sample(unique, target)
    extra = []
    while len(unique) + len(extra) < target:
        pick = random.choice(unique)
        words = pick.split()
        if len(words) > 2:
            words.pop(random.randint(0, len(words) - 1))
        extra.append(" ".join(words))
    return (unique + extra)[:target]

# ── slot kosakata berbasis merged_dataset.csv ─────────────────────────────────
S = {
    # entitas pelanggan
    "pl"    : ["pelanggan", "customer", "klien", "user", "nasabah",
               "pengguna", "subscriber", "konsumen", "member", "akun"],

    # customer id (diperluas ke 40 ID)
    "cid"   : [
        "C-0001", "C-0002", "C-0003", "C-0004", "C-0005",
        "C-0006", "C-0007", "C-0008", "C-0009", "C-0010",
        "C-0012", "C-0015", "C-0021", "C-0025", "C-0030",
        "C-0047", "C-0050", "C-0075", "C-0099", "C-0100",
        "C-0120", "C-0150", "C-0175", "C-0200", "C-0250",
        "C-0300", "C-0350", "C-0400", "C-0450", "C-0500",
        "C-0550", "C-0600", "C-0650", "C-0700", "C-0750",
        "C-0800", "C-0850", "C-0900", "C-0950", "C-1000",
    ],

    # plan_type
    "plan"  : ["starter", "professional", "enterprise", "basic", "premium"],

    # contract_type
    "kontrak": ["monthly", "annual", "bulanan", "tahunan", "kuartalan",
                "semi-annual", "triwulan"],

    # istilah churn
    "churn" : ["churn", "berhenti berlangganan", "cabut", "cancel",
               "keluar", "tidak lanjut", "putus kontrak", "unsubscribe",
               "resign", "mundur", "tidak perpanjang", "hengkang",
               "off", "berhenti", "tidak aktif lagi"],

    # kolom metrik dari dataset
    "metrik": [
        "tenure", "lama berlangganan", "usage", "pemakaian bulanan",
        "feature adoption", "tingkat adopsi fitur",
        "days since login", "hari sejak login", "terakhir login",
        "NPS", "skor kepuasan", "net promoter score",
        "ticket count", "jumlah tiket", "banyak tiket support",
        "dunning count", "jumlah dunning",
        "late payment", "pembayaran terlambat", "keterlambatan bayar",
        "total billed", "total tagihan", "nilai kontrak",
        "churn probability", "probabilitas churn", "risk score",
        "skor risiko", "revenue", "pendapatan",
    ],

    # faktor/penyebab
    "fk"    : ["faktor", "penyebab", "alasan", "pemicu", "driver",
               "sebab", "indikator", "variabel", "fitur", "atribut",
               "sinyal", "tanda", "parameter", "elemen"],

    # kata kerja tampil
    "tp"    : ["tampilkan", "tunjukkan", "lihat", "cek", "kasih tau",
               "buka", "analisis", "periksa", "tampilkan", "jabarkan",
               "uraikan", "berikan", "perlihatkan", "sajikan", "paparkan"],

    # kata tolong
    "tlg"   : ["tolong", "mohon", "bisa", "coba", "minta", "bantu",
               "please", "dong", "donk", "diminta"],

    # kata buat
    "buat"  : ["buat", "tulis", "susun", "ketik", "compose", "bikin",
               "draftkan", "siapkan", "rancang", "buatkan", "tuliskan",
               "susunkan", "ketikkan", "composekan", "kerjakan"],

    # email/pesan
    "email" : ["email", "pesan", "surat", "notifikasi", "teks penawaran",
               "pesan retensi", "draf pesan", "surat elektronik",
               "pesan promosi", "pesan follow up", "pesan diskon"],

    # strategi
    "aksi"  : ["strategi", "langkah", "tindakan", "cara", "solusi",
               "tips", "upaya", "program", "kebijakan", "rekomendasi",
               "pendekatan", "metode", "teknik", "rencana", "inisiatif"],

    # segmen/kelompok
    "seg"   : ["starter", "professional", "enterprise", "basic", "premium",
               "paket bulanan", "paket tahunan", "paket kuartalan",
               "kontrak monthly", "kontrak annual", "kontrak triwulan",
               "segmen", "kelompok pelanggan", "kategori", "tier"],

    # tren/waktu referensi
    "tren"  : ["tren", "grafik", "pola", "historis", "pergerakan",
               "statistik", "chart", "evolusi", "dinamika", "kurva",
               "fluktuasi", "perubahan", "perkembangan"],

    # waktu
    "waktu" : ["bulan ini", "bulan lalu", "kuartal ini", "kuartal lalu",
               "tahun ini", "tahun lalu", "minggu ini", "minggu lalu",
               "30 hari terakhir", "60 hari terakhir", "90 hari terakhir",
               "semester ini", "hari ini", "pekan ini"],

    # model AI
    "ai"    : ["model", "algoritma", "AI", "sistem prediksi",
               "teknologi", "machine learning", "deep learning",
               "model prediksi", "sistem AI", "model ML",
               "random forest", "neural network", "sistem cerdas"],

    # ringkasan
    "ovr"   : ["ringkasan", "overview", "summary", "highlight",
               "gambaran umum", "laporan", "snapshot", "rekap",
               "ikhtisar", "rangkuman", "resume"],

    # VIP / nilai tinggi
    "vip"   : ["enterprise", "premium", "high value", "VIP",
               "revenue tertinggi", "pelanggan besar", "klien kakap",
               "akun strategis", "pelanggan prioritas", "top account",
               "pelanggan utama", "big client"],

    # kata tanya jumlah
    "brp"   : ["berapa", "berapa total", "berapa banyak",
               "jumlah", "total", "hitung", "berapa jumlah",
               "ada berapa", "seberapa banyak", "hitungan"],
}

# ── template per intent ───────────────────────────────────────────────────────
RAW = {

# ─── 1. FAKTOR_CHURN ────────────────────────────────────────────────────────
"FAKTOR_CHURN": expand([
    "apa {fk} utama {churn}",
    "{fk} apa saja yang menyebabkan {churn}",
    "kenapa {pl} {churn}",
    "mengapa {pl} berhenti berlangganan",
    "apa yang membuat {pl} {churn}",
    "{fk} mana yang paling mempengaruhi {churn}",
    "{tlg} sebutkan pemicu {churn} tertinggi",
    "kolom {metrik} mana yang paling penting untuk prediksi {churn}",
    "tanda tanda {pl} mau {churn}",
    "{fk} dominan {churn} apa",
    "korelasi tertinggi dengan {churn}",
    "apa sih yang bikin {pl} {churn}",
    "sinyal awal {pl} akan {churn}",
    "atribut paling signifikan untuk {churn}",
    "variabel terpenting penentu {churn}",
    "bagaimana {metrik} mempengaruhi {churn}",
    "apakah {metrik} berkorelasi dengan {churn}",
    "apa hubungan {metrik} dengan risiko {churn}",
    "kenapa banyak {pl} {kontrak} yang {churn}",
    "kenapa {pl} plan {plan} banyak yang {churn}",
    "apa pola {pl} yang {churn} di plan {plan}",
    "ciri ciri {pl} yang akan {churn} itu apa",
], S),

# ─── 2. VIP_RISK ────────────────────────────────────────────────────────────
"VIP_RISK": expand([
    "siapa {pl} {vip} yang berisiko {churn}",
    "{pl} {vip} mana yang mau {churn}",
    "{tlg} cek {pl} {vip} yang mau kabur",
    "tampilkan klien {vip} yang mau putus kontrak",
    "siapa yang revenue-nya paling besar tapi mau {churn}",
    "{pl} plan {plan} mana yang hampir pergi",
    "customer {vip} yang berisiko tinggi siapa saja",
    "daftarkan {pl} {vip} yang mau {churn}",
    "siapa {pl} yang paling rugi kalau {churn}",
    "{pl} {vip} dengan {metrik} rendah siapa",
    "siapa {pl} enterprise yang {churn}",
    "{pl} kontrak {kontrak} bernilai tinggi yang berisiko",
    "mana {pl} {vip} yang perlu segera ditangani",
    "{pl} dengan total tagihan tinggi yang mau {churn}",
    "{pl} paling berharga yang terancam {churn}",
    "list {pl} {vip} yang probabilitas {churn}-nya tinggi",
], S),

# ─── 3. JUMLAH_RISIKO_TINGGI ────────────────────────────────────────────────
"JUMLAH_RISIKO_TINGGI": expand([
    "{brp} {pl} risiko tinggi",
    "ada {brp} {pl} yang berisiko tinggi",
    "total {pl} high risk sekarang",
    "{brp} {pl} yang mau {churn}",
    "jumlah {pl} yang terancam {churn}",
    "{brp} {pl} kategori kritis",
    "total {pl} di zona merah",
    "{brp} persen {pl} berisiko",
    "angka {pl} yang mau {churn}",
    "{tlg} hitung yang masuk high risk",
    "kasih tau total {pl} yang mau cancel",
    "{brp} {pl} plan {plan} yang berisiko tinggi",
    "{brp} {pl} kontrak {kontrak} yang mau {churn}",
    "{brp} {pl} yang probabilitas {churn}-nya di atas 70 persen",
    "ada berapa orang yang masuk kategori berbahaya",
    "berapa customer yang masuk zona risiko tinggi",
    "berapa {pl} yang {metrik}-nya buruk",
], S),

# ─── 4. ANALISIS_PELANGGAN ──────────────────────────────────────────────────
"ANALISIS_PELANGGAN": expand([
    "{tlg} analisis profil {pl} {cid}",
    "cek detail {pl} {cid}",
    "{tp} profil {pl} {cid}",
    "info lengkap {pl} {cid}",
    "bagaimana status {pl} {cid}",
    "ringkasan {pl} {cid}",
    "data lengkap {pl} {cid}",
    "periksa {pl} {cid}",
    "gimana kondisi {pl} {cid}",
    "ceritakan tentang {pl} {cid}",
    "saya mau lihat riwayat {pl} {cid}",
    "{tp} {metrik} untuk {pl} {cid}",
    "bagaimana {metrik} dari {pl} {cid}",
    "apakah {pl} {cid} berisiko {churn}",
    "apa plan {pl} {cid}",
    "berapa lama {pl} {cid} berlangganan",
    "kapan terakhir {pl} {cid} login",
    "berapa NPS dari {pl} {cid}",
    "berapa tiket dari {pl} {cid}",
], S),

# ─── 5. STRATEGI_RETENSI ────────────────────────────────────────────────────
"STRATEGI_RETENSI": expand([
    "apa {aksi} retensi yang disarankan",
    "bagaimana {aksi} mencegah {churn}",
    "saran untuk mengurangi {churn}",
    "rekomendasi retensi {pl}",
    "{aksi} mempertahankan {pl} plan {plan}",
    "{aksi} untuk {pl} yang {metrik}-nya rendah",
    "cara menjaga {pl} agar tidak {churn}",
    "apa yang harus dilakukan untuk retensi",
    "gimana caranya biar {pl} ga {churn}",
    "kasih tau {aksi} biar {churn} turun",
    "{aksi} supaya {pl} tidak cancel",
    "apa langkah konkret untuk menekan angka {churn}",
    "kebijakan apa untuk retensi {pl} {plan}",
    "program retensi apa yang efektif untuk {pl} {kontrak}",
    "inisiatif apa untuk menjaga {pl} {vip}",
    "bagaimana memenangkan kembali {pl} yang hampir {churn}",
    "apa solusi untuk {pl} dengan NPS rendah",
    "tindakan apa untuk {pl} dengan banyak tiket",
], S),

# ─── 6. DRAF_EMAIL ──────────────────────────────────────────────────────────
"DRAF_EMAIL": expand([
    "{buat}kan draf {email} untuk {pl} {cid}",
    "{tlg} {buat} {email} penawaran untuk {pl}",
    "template {email} untuk {pl} yang mau {churn}",
    "{buat} pesan untuk {pl} berisiko",
    "{buat} {email} penawaran diskon untuk {pl} plan {plan}",
    "{buat} {email} follow up untuk {pl} {cid}",
    "compose {email} untuk {pl} {vip} yang mau {churn}",
    "draf {email} retensi untuk {pl} kontrak {kontrak}",
    "{buat} penawaran khusus via {email} untuk {pl} {plan}",
    "{buat} pesan untuk {pl} yang tidak aktif",
    "{tlg} ketikkan {email} untuk {pl} {cid}",
    "{buat}kan teks penawaran buat {pl} yang mau {churn}",
    "susunkan {email} penawaran buat {cid}",
    "{buat}kan template {email} untuk {pl} dengan NPS rendah",
    "{buat} {email} khusus untuk {pl} {vip}",
    "tulis notifikasi untuk {pl} berisiko di plan {plan}",
], S),

# ─── 7. GREETING ────────────────────────────────────────────────────────────
"GREETING": [
    "halo", "hai", "hello", "hi", "hey", "selamat pagi", "selamat siang",
    "selamat sore", "selamat malam", "assalamualaikum", "pagi", "sore", "malam",
    "halo bot", "hai bot", "hai copilot", "hello copilot", "good morning",
    "good afternoon", "good evening", "hei", "hei apa kabar bot",
    "tes", "tes tes", "bisa bantu apa", "kamu bisa apa saja",
    "ada fitur apa saja", "menu apa saja yang tersedia", "aku bisa tanya apa saja",
    "permisi", "apa kabar", "gimana kabar", "halo selamat datang",
    "hai selamat pagi", "hai selamat malam", "howdy", "halo mas", "halo mbak",
    "halo teman", "hi there", "yo", "halo semua", "hai semuanya",
    "met pagi", "met siang", "met sore", "met malam", "hay",
    "halo ada orang", "ada di situ", "ping", "tes bot", "halo halo",
    "hai halo", "selamat datang", "mulai", "start", "bantuan",
    "help", "halo bantuan", "mau tanya", "mau nanya", "boleh tanya",
    "bisa tanya", "halo mau nanya", "hai mau nanya", "permisi bot",
    "eh halo", "eh hai", "halo copilot", "sini bot", "eh bot",
    "hei bot", "hei copilot", "selamat pagi bot", "selamat malam bot",
    "halo cs copilot", "hai cs copilot", "hello cs", "hi cs",
    "pagi copilot", "malam copilot", "sore copilot",
],

# ─── 8. TREN_CHURN ──────────────────────────────────────────────────────────
"TREN_CHURN": expand([
    "bagaimana {tren} {churn} {waktu}",
    "{tren} {churn} rate {waktu}",
    "grafik {churn} dari waktu ke waktu",
    "pola {churn} {pl}",
    "apakah {churn} naik atau turun {waktu}",
    "historis {churn} rate",
    "pergerakan angka {churn} {waktu}",
    "chart {tren} {churn}",
    "statistik {churn} {waktu}",
    "evolusi {churn} rate",
    "bagaimana perkembangan {churn} kita",
    "lihat {tren} pembatalan {waktu}",
    "bagaimana perubahan {churn} dari bulan ke bulan",
    "apakah angka {churn} kita membaik {waktu}",
    "perbandingan {churn} bulan lalu dan sekarang",
    "kapan {churn} paling tinggi",
    "apakah ada kenaikan {churn} {waktu}",
    "{tren} {churn} plan {plan} gimana",
    "{tren} {churn} untuk kontrak {kontrak}",
], S),

# ─── 9. SEGMEN_ANALISIS ─────────────────────────────────────────────────────
"SEGMEN_ANALISIS": expand([
    "{churn} rate per plan type",
    "{seg} mana yang paling banyak {churn}",
    "perbandingan {churn} antar {seg}",
    "plan mana yang paling berisiko",
    "starter vs professional vs enterprise {churn}",
    "{churn} berdasarkan tipe kontrak",
    "monthly vs annual {churn} rate",
    "segmentasi {pl} berdasarkan risiko",
    "kelompok {pl} mana yang paling {churn}",
    "breakdown {churn} per {seg}",
    "distribusi {churn} per plan",
    "perbandingan {churn} rate antar plan",
    "mana yang lebih banyak {churn} antara {seg}",
    "persentase {churn} tiap kelompok {pl}",
    "{seg} apa yang paling aman dari {churn}",
    "distribusi risiko per tipe {pl}",
    "bagaimana {metrik} berbeda antar {seg}",
    "compare {churn} rate plan {plan} vs plan lain",
    "{churn} paling tinggi di segmen mana",
    "analisis {churn} berdasarkan {seg}",
], S),

# ─── 10. MODEL_INFO ─────────────────────────────────────────────────────────
"MODEL_INFO": expand([
    "{ai} apa yang digunakan untuk prediksi {churn}",
    "algoritma apa yang dipakai dashboard ini",
    "bagaimana cara kerja {ai} prediksi {churn}",
    "akurasi {ai} prediksi berapa",
    "jelaskan {ai} yang digunakan",
    "teknik {ai} untuk {churn}",
    "performa {ai} prediksi {churn}",
    "metode prediksi {churn} apa",
    "bagaimana {ai} memprediksi {churn}",
    "apakah ini menggunakan random forest",
    "teknologi apa yang dipakai untuk prediksi {churn}",
    "seberapa akurat sistem prediksi ini",
    "{ai} apa yang mendasari sistem ini",
    "apakah pakai deep learning atau machine learning biasa",
    "seberapa andal {ai} prediksinya",
    "bagaimana tingkat akurasi sistem ini",
    "kolom apa yang dipakai {ai} untuk prediksi {churn}",
    "apakah {metrik} dipakai sebagai input model",
    "bagaimana model menghitung probabilitas {churn}",
], S),

# ─── 11. METRIK_OVERVIEW ────────────────────────────────────────────────────
"METRIK_OVERVIEW": expand([
    "berikan {ovr} dashboard {waktu}",
    "{ovr} metrik {churn}",
    "summary kondisi {pl} saat ini",
    "bagaimana kondisi keseluruhan {waktu}",
    "status {churn} saat ini",
    "highlight dashboard {waktu}",
    "rangkuman situasi {pl}",
    "{tp} metrik utama {waktu}",
    "berikan {ovr} eksekutif",
    "kasih saya snapshot kondisi bisnis {waktu}",
    "seperti apa situasi {churn} kita secara keseluruhan",
    "berikan laporan harian {pl}",
    "kondisi {pl} {waktu} gimana",
    "update kondisi {pl} dong",
    "apa situasi terkini bisnis kita",
    "berapa total {pl} churn {waktu}",
    "berapa {pl} baru {waktu}",
    "bagaimana {metrik} secara keseluruhan {waktu}",
    "ringkasan performa bisnis {waktu}",
], S),
}

# ── balance & tulis CSV ───────────────────────────────────────────────────────
rows = []
for intent, samples in RAW.items():
    for text in balance(samples, TARGET):
        rows.append({"text": text.strip(), "intent": intent})

random.shuffle(rows)

with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["text", "intent"])
    writer.writeheader()
    writer.writerows(rows)

counts = Counter(r["intent"] for r in rows)
print(f"\nTotal sampel : {len(rows)}")
print(f"Disimpan ke  : {OUTPUT}\n")
print(f"{'Intent':<25} {'Jumlah':>8}")
print("-" * 35)
for intent, n in sorted(counts.items()):
    print(f"{intent:<25} {n:>8}")
