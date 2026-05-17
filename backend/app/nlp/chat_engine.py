"""
Chat Engine — Response Generator.
Menerima pesan user, klasifikasi intent via NLP, generate response.
"""

from app.nlp.intent_classifier import classify_intent
from app.services.customer_service import CustomerService


def process_chat(message: str) -> str:
    """Main entry point: proses pesan user dan return response."""
    result = classify_intent(message)
    intent = result['intent']
    entities = result['entities']
    confidence = result['confidence']

    handlers = {
        'FAKTOR_CHURN': _handle_faktor_churn,
        'VIP_RISK': _handle_vip_risk,
        'JUMLAH_RISIKO_TINGGI': _handle_jumlah_risiko_tinggi,
        'ANALISIS_PELANGGAN': lambda: _handle_analisis_pelanggan(entities),
        'STRATEGI_RETENSI': _handle_strategi_retensi,
        'DRAF_EMAIL': lambda: _handle_draf_email(entities),
        'GREETING': _handle_greeting,
        'TREN_CHURN': _handle_tren_churn,
        'SEGMEN_ANALISIS': _handle_segmen_analisis,
        'MODEL_INFO': _handle_model_info,
        'METRIK_OVERVIEW': _handle_metrik_overview,
    }

    handler = handlers.get(intent)
    if handler:
        return handler()
    return _handle_fallback(confidence)


def _handle_faktor_churn() -> str:
    return (
        '<i class="fa-solid fa-chart-pie" style="color: #4f8ef7;"></i> '
        '**Analisis Feature Importance — Faktor Utama Churn**\n\n'
        'Berdasarkan model Deep Learning (Neural Network + Random Forest ensemble), '
        'berikut faktor yang paling mempengaruhi churn pelanggan:\n\n'
        '**1. Hari Sejak Login Terakhir (last_login_days_ago) — 11.45%**\n'
        'Pelanggan yang tidak login > 30 hari memiliki probabilitas churn 3.2x lebih tinggi.\n\n'
        '**2. Jumlah Support Tickets (support_tickets_last_90d) — 10.07%**\n'
        'Pelanggan dengan > 10 tiket dalam 90 hari menunjukkan frustrasi tinggi.\n\n'
        '**3. Monthly Usage Hours (monthly_usage_hrs) — 9.98%**\n'
        'Penurunan penggunaan bulanan adalah early warning signal terkuat.\n\n'
        '**4. Feature Adoption (feature_adoption_pct) — 9.21%**\n'
        'Adopsi fitur < 30% berarti pelanggan tidak mendapat value dari produk.\n\n'
        '**5. Contract Type (contract_type) — 8.54%**\n'
        'Kontrak Monthly memiliki churn rate 2.1x lebih tinggi dari Annual.\n\n'
        '**6. Payment Delay Count — 7.83%**\n'
        'Keterlambatan bayar berulang (≥3x) berkorelasi kuat dengan churn.\n\n'
        '**Insight:** Kombinasi login jarang + tiket banyak + adopsi rendah '
        'adalah "triple threat" yang hampir pasti menghasilkan churn.'
    )


def _handle_vip_risk() -> str:
    service = CustomerService()
    high_risk = service.get_high_risk_customers()
    if not high_risk:
        return ('<i class="fa-solid fa-check-circle" style="color: #2da44e;"></i> '
                'Kabar baik! Saat ini tidak ada pelanggan VIP yang berisiko tinggi.')

    top = high_risk[0]
    return (
        f'<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i> '
        f'**Peringatan VIP Churn!**\n\n'
        f'Pelanggan dengan potensi kerugian terbesar saat ini adalah **{top["customer_id"]}**.\n\n'
        f'- **Plan:** {top["plan_type"]} ({top["contract_type"]})\n'
        f'- **Revenue:** Rp {top["monthly_revenue"]:,.0f}/bulan\n'
        f'- **Skor Risiko:** {top["risk_score"]}% ({top["risk_label"]})\n'
        f'- **Isu Utama:** Tidak login selama {top["last_login_days_ago"]} hari '
        f'dan memiliki {top["support_tickets_last_90d"]} tiket support aktif.\n'
        f'- **Tenure:** {top["tenure_months"]} bulan\n'
        f'- **Adopsi Fitur:** {top["feature_adoption_pct"]}%\n\n'
        f'**Estimasi Kerugian:** Rp {top["monthly_revenue"] * 12:,.0f}/tahun jika churn.\n\n'
        f'**Tindakan Segera:** Tim CS Enterprise harus menjadwalkan '
        f'*executive check-in call* dalam 24 jam!'
    )


def _handle_jumlah_risiko_tinggi() -> str:
    service = CustomerService()
    stats = service.get_stats()
    return (
        f'<i class="fa-solid fa-chart-bar" style="color: #4f8ef7;"></i> '
        f'**Statistik Risiko Pelanggan**\n\n'
        f'| Kategori | Jumlah | Persentase |\n'
        f'|----------|--------|------------|\n'
        f'| 🔴 Risiko Tinggi | **{stats["high_risk"]}** | {stats["high_risk_pct"]:.1f}% |\n'
        f'| 🟡 Risiko Sedang | **{stats["med_risk"]}** | {stats["med_risk_pct"]:.1f}% |\n'
        f'| 🟢 Risiko Rendah | **{stats["low_risk"]}** | {stats["low_risk_pct"]:.1f}% |\n\n'
        f'**Total Pelanggan:** {stats["total"]}\n'
        f'**Revenue at Risk:** Rp {stats["revenue_at_risk"]:,.0f}/bulan\n\n'
        f'Pelanggan risiko tinggi memiliki probabilitas churn di atas 65%.'
    )


def _handle_analisis_pelanggan(entities: dict) -> str:
    customer_id = entities.get('customer_id')
    if not customer_id:
        return (
            '<i class="fa-solid fa-info-circle" style="color: #4f8ef7;"></i> '
            'Mohon sebutkan Customer ID yang ingin dianalisis.\n\n'
            '**Contoh:**\n'
            '- "Analisis C-0001"\n'
            '- "Cek profil C-0003"\n'
            '- "Bagaimana kondisi C-0008?"'
        )

    service = CustomerService()
    c = service.get_customer(customer_id)
    if not c:
        return f'Pelanggan dengan ID **{customer_id}** tidak ditemukan.'

    nps_label = 'Detractor' if c['nps_score'] <= 3 else ('Passive' if c['nps_score'] <= 7 else 'Promoter')
    risk_emoji = '🔴' if c['risk_class'] == 'high' else ('🟡' if c['risk_class'] == 'med' else '🟢')

    diagnosis = ''
    if c['risk_score'] >= 66:
        diagnosis = 'Pelanggan ini dalam kondisi KRITIS. Perlu intervensi segera dari tim CS.'
    elif c['risk_score'] >= 31:
        diagnosis = 'Pelanggan perlu perhatian ekstra. Monitor engagement dan jadwalkan check-in.'
    else:
        diagnosis = 'Pelanggan dalam kondisi sehat. Pertahankan kualitas layanan.'

    return (
        f'<i class="fa-solid fa-magnifying-glass" style="color: #4f8ef7;"></i> '
        f'**Profil Lengkap {customer_id}**\n\n'
        f'**Informasi Langganan:**\n'
        f'- Paket: {c["plan_type"]} ({c["contract_type"]})\n'
        f'- Tenure: {c["tenure_months"]} bulan\n'
        f'- Revenue: Rp {c["monthly_revenue"]:,.0f}/bulan\n\n'
        f'**Metrik Engagement:**\n'
        f'- Penggunaan: {c["monthly_usage_hrs"]} jam/bulan\n'
        f'- Adopsi Fitur: {c["feature_adoption_pct"]}%\n'
        f'- Login Terakhir: {c["last_login_days_ago"]} hari lalu\n'
        f'- Total Users: {c["total_users"]}\n\n'
        f'**Kesehatan Pelanggan:**\n'
        f'- {risk_emoji} Status Risiko: **{c["risk_score"]}% ({c["risk_label"]})**\n'
        f'- NPS Score: {c["nps_score"]}/10 ({nps_label})\n'
        f'- Tiket Support: {c["support_tickets_last_90d"]} tiket (90 hari)\n'
        f'- Keterlambatan Bayar: {c["payment_delay_count"]}x\n\n'
        f'**Diagnosis AI:** {diagnosis}'
    )


def _handle_strategi_retensi() -> str:
    return (
        '<i class="fa-solid fa-lightbulb" style="color: #eab308;"></i> '
        '**Strategi Retensi Berbasis Data — Rekomendasi AI**\n\n'
        '**🎯 Prioritas Tinggi (Impact Besar):**\n\n'
        '1. **Proactive Outreach untuk Pelanggan Tidak Aktif**\n'
        '   - Target: Pelanggan dengan last_login > 30 hari\n'
        '   - Aksi: Personal call dari CS + email re-engagement\n'
        '   - Expected Impact: Kurangi churn 15-20%\n\n'
        '2. **Eskalasi Support untuk High-Ticket Customers**\n'
        '   - Target: Pelanggan dengan support_tickets > 8\n'
        '   - Aksi: Assign dedicated account manager\n'
        '   - Expected Impact: Kurangi churn 12-18%\n\n'
        '3. **Feature Adoption Campaign**\n'
        '   - Target: Pelanggan dengan feature_adoption < 30%\n'
        '   - Aksi: Webinar 1-on-1, tutorial video, in-app guidance\n'
        '   - Expected Impact: Kurangi churn 10-15%\n\n'
        '**💡 Quick Wins:**\n\n'
        '4. **Contract Upgrade Incentive**\n'
        '   - Tawarkan diskon 20% untuk upgrade Monthly → Annual\n\n'
        '5. **Payment Flexibility Program**\n'
        '   - Untuk pelanggan dengan payment_delay ≥ 3\n\n'
        '6. **NPS Follow-up Loop**\n'
        '   - Survey pelanggan dengan NPS ≤ 3'
    )


def _handle_draf_email(entities: dict) -> str:
    customer_id = entities.get('customer_id')
    if not customer_id:
        return (
            '<i class="fa-solid fa-envelope" style="color: #4f8ef7;"></i> '
            'Untuk membuat draf email yang dipersonalisasi, saya perlu Customer ID.\n\n'
            '**Contoh:**\n'
            '- "Buatkan draf email untuk C-0001"\n'
            '- "Draft email retensi C-0008"'
        )

    service = CustomerService()
    c = service.get_customer(customer_id)
    if not c:
        return f'Pelanggan **{customer_id}** tidak ditemukan.'

    risk_level = 'Tinggi' if c['risk_score'] >= 66 else ('Sedang' if c['risk_score'] >= 31 else 'Rendah')
    discount = '30%' if c['risk_score'] >= 66 else ('20%' if c['risk_score'] >= 31 else '10%')

    return (
        f'<i class="fa-solid fa-envelope-open-text" style="color: #4f8ef7;"></i> '
        f'**Draf Email untuk {customer_id}**\n\n'
        f'**Analisis AI:** Risiko churn {risk_level} ({c["risk_score"]}%). '
        f'Belum login {c["last_login_days_ago"]} hari. Usage: {c["monthly_usage_hrs"]} jam/bulan.\n\n'
        f'---\n\n'
        f'**Subjek:** Kami Rindu Anda! Dapatkan Diskon Khusus {discount} 🎁\n\n'
        f'Halo,\n\n'
        f'Kami melihat Anda sudah {c["last_login_days_ago"]} hari tidak mengunjungi platform kami. '
        f'Sebagai apresiasi karena Anda telah bersama kami selama **{c["tenure_months"]} bulan**, '
        f'kami memberikan **diskon eksklusif {discount}** untuk perpanjangan langganan '
        f'{c["plan_type"]} Anda bulan ini.\n\n'
        f'Klik tautan ini untuk mengaktifkan diskon: [Tautan Promo]\n\n'
        f'Salam Hangat,\nTim Customer Success\n\n---'
    )


def _handle_greeting() -> str:
    return (
        'Halo! Ghosting siap membantu '
        '<i class="fa-solid fa-robot" style="color: #4f8ef7;"></i>\n\n'
        'Saya menggunakan **Deep Learning NLP** untuk memahami pertanyaan Anda. '
        'Coba tanyakan dengan bahasa natural:\n\n'
        '- *"Fitur apa yang paling mempengaruhi churn?"*\n'
        '- *"Siapa pelanggan VIP yang terancam pergi?"*\n'
        '- *"Berapa total customer yang berisiko tinggi?"*\n'
        '- *"Cek profil C-0001"*\n'
        '- *"Bagaimana tren churn bulan ini?"*\n'
        '- *"Buat email retensi untuk C-0008"*'
    )


def _handle_tren_churn() -> str:
    service = CustomerService()
    stats = service.get_stats()
    return (
        '<i class="fa-solid fa-chart-line" style="color: #4f8ef7;"></i> '
        '**Tren & Pola Churn**\n\n'
        f'**Churn Rate Saat Ini:** {stats["high_risk_pct"]:.1f}% pelanggan dalam zona risiko tinggi\n\n'
        '**Pola yang Terdeteksi Model AI:**\n\n'
        '1. **Pola Waktu:** Churn cenderung meningkat pada bulan ke-3 dan ke-12 tenure\n'
        '2. **Pola Engagement:** 78% pelanggan yang churn menunjukkan penurunan usage 40%+ '
        'dalam 30 hari sebelum cancel\n'
        '3. **Pola Support:** Lonjakan tiket support (>5 dalam 2 minggu) adalah leading indicator\n'
        '4. **Pola Kontrak:** Monthly customers memiliki churn rate 2.1x lebih tinggi dari Annual\n\n'
        '**Early Warning Signals:**\n'
        '- Login gap > 14 hari → 35% kemungkinan churn dalam 60 hari\n'
        '- NPS drop > 3 poin → 28% kemungkinan churn\n'
        '- Feature adoption turun > 20% → 42% kemungkinan churn'
    )


def _handle_segmen_analisis() -> str:
    service = CustomerService()
    seg = service.get_segment_stats()
    return (
        '<i class="fa-solid fa-layer-group" style="color: #4f8ef7;"></i> '
        '**Analisis Churn per Segmen**\n\n'
        '**Per Plan Type:**\n'
        '| Plan | Total | High Risk | Churn Rate |\n'
        '|------|-------|-----------|------------|\n'
        f'| Starter | {seg["plans"]["Starter"]["total"]} | '
        f'{seg["plans"]["Starter"]["high_risk"]} | '
        f'{seg["plans"]["Starter"]["rate"]:.1f}% |\n'
        f'| Professional | {seg["plans"]["Professional"]["total"]} | '
        f'{seg["plans"]["Professional"]["high_risk"]} | '
        f'{seg["plans"]["Professional"]["rate"]:.1f}% |\n'
        f'| Enterprise | {seg["plans"]["Enterprise"]["total"]} | '
        f'{seg["plans"]["Enterprise"]["high_risk"]} | '
        f'{seg["plans"]["Enterprise"]["rate"]:.1f}% |\n\n'
        '**Per Contract Type:**\n'
        '| Contract | Total | High Risk | Churn Rate |\n'
        '|----------|-------|-----------|------------|\n'
        f'| Monthly | {seg["contracts"]["Monthly"]["total"]} | '
        f'{seg["contracts"]["Monthly"]["high_risk"]} | '
        f'{seg["contracts"]["Monthly"]["rate"]:.1f}% |\n'
        f'| Annual | {seg["contracts"]["Annual"]["total"]} | '
        f'{seg["contracts"]["Annual"]["high_risk"]} | '
        f'{seg["contracts"]["Annual"]["rate"]:.1f}% |\n\n'
        '**Insight AI:** Pelanggan Monthly memiliki risiko churn lebih tinggi. '
        'Fokuskan program upgrade ke Annual untuk segmen ini.'
    )


def _handle_model_info() -> str:
    return (
        '<i class="fa-solid fa-brain" style="color: #8b5cf6;"></i> '
        '**Model Prediksi Churn — Arsitektur AI**\n\n'
        '**Ensemble Model yang Digunakan:**\n\n'
        '1. **Random Forest Classifier** — Akurasi: 87.3% | AUC-ROC: 0.91\n'
        '2. **Neural Network (Deep Learning)** — 3 hidden layers (128→64→32) | Akurasi: 89.1%\n'
        '3. **Gradient Boosting (XGBoost)** — Akurasi: 88.7% | Precision: 0.84\n\n'
        '**Input Features:**\n'
        '`plan_type`, `contract_type`, `tenure_months`, `monthly_revenue`, '
        '`monthly_usage_hrs`, `total_users`, `feature_adoption_pct`, '
        '`support_tickets_last_90d`, `last_login_days_ago`, `nps_score`, '
        '`payment_delay_count`\n\n'
        '**Chatbot NLP Engine:**\n'
        '- Indonesian Stemming (Sastrawi / Nazief-Adriani)\n'
        '- Word Embeddings (16-dim dense vectors)\n'
        '- TF-IDF + Cosine Similarity\n'
        '- Fuzzy Matching (Levenshtein)\n'
        '- Multi-signal Neural Intent Classifier'
    )


def _handle_metrik_overview() -> str:
    service = CustomerService()
    stats = service.get_stats()
    return (
        '<i class="fa-solid fa-gauge-high" style="color: #4f8ef7;"></i> '
        '**Dashboard Overview — Ringkasan Hari Ini**\n\n'
        '**📊 Metrik Utama:**\n'
        f'- Total Pelanggan: **{stats["total"]}**\n'
        f'- Rata-rata Skor Risiko: **{stats["avg_score"]:.1f}%**\n'
        f'- Total Revenue: **Rp {stats["total_revenue"]:,.0f}**/bulan\n'
        f'- Revenue at Risk: **Rp {stats["revenue_at_risk"]:,.0f}**/bulan\n\n'
        '**⚠️ Perlu Perhatian:**\n'
        f'- {stats["high_risk"]} pelanggan dalam zona risiko tinggi\n'
        f'- {stats["inactive_30d"]} pelanggan tidak login > 30 hari\n'
        f'- {stats["high_tickets"]} pelanggan dengan tiket support ≥ 10\n\n'
        '**✅ Kabar Baik:**\n'
        f'- {stats["low_risk"]} pelanggan dalam kondisi sehat\n'
        f'- {stats["high_adoption"]} pelanggan dengan adopsi fitur tinggi (>70%)'
    )


def _handle_fallback(confidence: float) -> str:
    return (
        '<i class="fa-solid fa-circle-question" style="color: #6b7280;"></i> '
        f'Maaf, saya belum cukup yakin memahami maksud Anda (confidence: {confidence * 100:.0f}%).\n\n'
        '**Saya bisa membantu dengan:**\n'
        '- 📊 *"Apa faktor utama penyebab churn?"*\n'
        '- 👤 *"Analisis profil C-0001"*\n'
        '- 🔴 *"Berapa pelanggan yang berisiko tinggi?"*\n'
        '- 💎 *"Siapa VIP yang terancam churn?"*\n'
        '- 💡 *"Saran strategi retensi"*\n'
        '- ✉️ *"Buatkan email untuk C-0008"*\n'
        '- 📈 *"Bagaimana tren churn?"*\n'
        '- 🏷️ *"Analisis churn per segmen"*\n'
        '- 🤖 *"Model AI apa yang digunakan?"*\n'
        '- 📋 *"Ringkasan dashboard hari ini"*\n\n'
        '💡 **Tips:** Anda bisa bertanya dengan bahasa natural!'
    )
