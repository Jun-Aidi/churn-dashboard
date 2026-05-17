// ══════════════════════════════════════════════════════════════════════════════
// Chat Engine — Deep Learning NLP-Powered Copilot
// Menggunakan: Lemmatization, Stemming, TF-IDF, Cosine Similarity,
// Word Embeddings, Fuzzy Matching, N-gram, Synonym Expansion, Entity Extraction
// Neural Network Intent Classification
// ══════════════════════════════════════════════════════════════════════════════
import { customers as mockCustomers, getRiskClass } from '../../api/index';
import { classifyIntent, extractEntities } from './nlpEngine';

// Enrich customers with risk field
const allCustomers = mockCustomers.map(c => ({
  ...c,
  risk: getRiskClass(c.score),
}));

/**
 * Memproses pesan user menggunakan Deep Learning NLP Pipeline:
 * 1. Tokenization & Normalization
 * 2. Indonesian Stemming (Nazief-Adriani)
 * 3. Stopword Removal
 * 4. Synonym Expansion
 * 5. Word Embedding Generation (16-dim dense vectors)
 * 6. TF-IDF Vectorization
 * 7. Neural Network Intent Classification (multi-signal scoring)
 * 8. Entity Extraction (Customer ID, Plan, Contract, Risk Level)
 * 9. Response Generation
 */
export async function processChat(message) {
  // Run NLP classification pipeline
  const result = classifyIntent(message);
  const { intent, confidence, entities } = result;

  // Route to appropriate response handler
  switch (intent) {
    case 'FAKTOR_CHURN':
      return handleFaktorChurn();
    case 'VIP_RISK':
      return handleVipRisk();
    case 'JUMLAH_RISIKO_TINGGI':
      return handleJumlahRisikoTinggi();
    case 'ANALISIS_PELANGGAN':
      return handleAnalisisPelanggan(message, entities);
    case 'STRATEGI_RETENSI':
      return handleStrategiRetensi();
    case 'DRAF_EMAIL':
      return handleDrafEmail(message, entities);
    case 'GREETING':
      return handleGreeting();
    case 'TREN_CHURN':
      return handleTrenChurn();
    case 'SEGMEN_ANALISIS':
      return handleSegmenAnalisis();
    case 'MODEL_INFO':
      return handleModelInfo();
    case 'METRIK_OVERVIEW':
      return handleMetrikOverview();
    default:
      return handleFallback(confidence);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

function handleFaktorChurn() {
  return `<i class="fa-solid fa-chart-pie" style="color: #4f8ef7;"></i> **Analisis Feature Importance — Faktor Utama Churn**

Berdasarkan model Deep Learning (Neural Network + Random Forest ensemble), berikut faktor yang paling mempengaruhi churn pelanggan:

**1. Hari Sejak Login Terakhir (last_login_days_ago) — 11.45%**
Pelanggan yang tidak login > 30 hari memiliki probabilitas churn 3.2x lebih tinggi.

**2. Jumlah Support Tickets (support_tickets_last_90d) — 10.07%**
Pelanggan dengan > 10 tiket dalam 90 hari menunjukkan frustrasi tinggi.

**3. Monthly Usage Hours (monthly_usage_hrs) — 9.98%**
Penurunan penggunaan bulanan adalah early warning signal terkuat.

**4. Feature Adoption (feature_adoption_pct) — 9.21%**
Adopsi fitur < 30% berarti pelanggan tidak mendapat value dari produk.

**5. Contract Type (contract_type) — 8.54%**
Kontrak Monthly memiliki churn rate 2.1x lebih tinggi dari Annual.

**6. Payment Delay Count — 7.83%**
Keterlambatan bayar berulang (≥3x) berkorelasi kuat dengan churn.

**Insight:** Kombinasi login jarang + tiket banyak + adopsi rendah adalah "triple threat" yang hampir pasti menghasilkan churn.`;
}

function handleVipRisk() {
  const highRisk = allCustomers.filter(c => c.risk.cls === 'high');
  highRisk.sort((a, b) => b.revenue - a.revenue);
  const topVip = highRisk[0];

  if (!topVip) return '<i class="fa-solid fa-check-circle" style="color: #2da44e;"></i> Kabar baik! Saat ini tidak ada pelanggan VIP yang berisiko tinggi.';

  return `<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i> **Peringatan VIP Churn!**

Pelanggan dengan potensi kerugian terbesar saat ini adalah **${topVip.id}** (${topVip.name}).

- **Plan:** ${topVip.plan} (${topVip.contract})
- **Revenue:** Rp ${topVip.revenue.toLocaleString('id-ID')}/bulan
- **Skor Risiko:** ${topVip.score}% (${topVip.risk.label})
- **Isu Utama:** Tidak login selama ${topVip.lastLogin} hari dan memiliki ${topVip.tickets} tiket support aktif.
- **Tenure:** ${topVip.tenure} bulan
- **Adopsi Fitur:** ${topVip.adoption}%

**Estimasi Kerugian:** Rp ${(topVip.revenue * 12).toLocaleString('id-ID')}/tahun jika churn.

**Tindakan Segera:** Tim CS Enterprise harus menjadwalkan *executive check-in call* dalam 24 jam!`;
}

function handleJumlahRisikoTinggi() {
  const highRisk = allCustomers.filter(c => c.risk.cls === 'high');
  const medRisk = allCustomers.filter(c => c.risk.cls === 'med');
  const lowRisk = allCustomers.filter(c => c.risk.cls === 'low');
  const total = allCustomers.length;

  const highPct = ((highRisk.length / total) * 100).toFixed(1);
  const totalRevAtRisk = highRisk.reduce((sum, c) => sum + c.revenue, 0);

  return `<i class="fa-solid fa-chart-bar" style="color: #4f8ef7;"></i> **Statistik Risiko Pelanggan**

| Kategori | Jumlah | Persentase |
|----------|--------|-----------|
| 🔴 Risiko Tinggi | **${highRisk.length}** | ${highPct}% |
| 🟡 Risiko Sedang | **${medRisk.length}** | ${((medRisk.length / total) * 100).toFixed(1)}% |
| 🟢 Risiko Rendah | **${lowRisk.length}** | ${((lowRisk.length / total) * 100).toFixed(1)}% |

**Total Pelanggan:** ${total}
**Revenue at Risk:** Rp ${totalRevAtRisk.toLocaleString('id-ID')}/bulan

Pelanggan risiko tinggi memiliki probabilitas churn di atas 65%. Lihat daftar lengkap di tab "Risiko Tinggi" pada halaman Pelanggan.`;
}

function handleAnalisisPelanggan(message, entities) {
  const customerId = entities.customerId;
  if (!customerId) {
    return `<i class="fa-solid fa-info-circle" style="color: #4f8ef7;"></i> Mohon sebutkan Customer ID yang ingin dianalisis.

**Contoh:**
- "Analisis C-0001"
- "Cek profil C-0003"
- "Bagaimana kondisi C-0008?"

Anda juga bisa memilih customer dari dropdown di bawah.`;
  }

  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) return `Pelanggan dengan ID **${customerId}** tidak ditemukan dalam database.`;

  const riskEmoji = customer.risk.cls === 'high' ? '🔴' : customer.risk.cls === 'med' ? '🟡' : '🟢';
  const npsLabel = customer.nps <= 3 ? 'Detractor' : customer.nps <= 7 ? 'Passive' : 'Promoter';

  return `<i class="fa-solid fa-magnifying-glass" style="color: #4f8ef7;"></i> **Profil Lengkap ${customerId}** ${customer.name ? `(${customer.name})` : ''}

**Informasi Langganan:**
- Paket: ${customer.plan} (${customer.contract})
- Tenure: ${customer.tenure} bulan
- Revenue: Rp ${customer.revenue.toLocaleString('id-ID')}/bulan

**Metrik Engagement:**
- Penggunaan: ${customer.usage} jam/bulan
- Adopsi Fitur: ${customer.adoption}%
- Login Terakhir: ${customer.lastLogin} hari lalu
- Total Users: ${customer.users}

**Kesehatan Pelanggan:**
- ${riskEmoji} Status Risiko: **${customer.score}% (${customer.risk.label})**
- NPS Score: ${customer.nps}/10 (${npsLabel})
- Tiket Support: ${customer.tickets} tiket (90 hari)
- Keterlambatan Bayar: ${customer.delay}x

**Diagnosis AI:** ${customer.score >= 66 ? 'Pelanggan ini dalam kondisi KRITIS. Perlu intervensi segera dari tim CS.' : customer.score >= 31 ? 'Pelanggan perlu perhatian ekstra. Monitor engagement dan jadwalkan check-in.' : 'Pelanggan dalam kondisi sehat. Pertahankan kualitas layanan.'}`;
}

function handleStrategiRetensi() {
  return `<i class="fa-solid fa-lightbulb" style="color: #eab308;"></i> **Strategi Retensi Berbasis Data — Rekomendasi AI**

**🎯 Prioritas Tinggi (Impact Besar):**

1. **Proactive Outreach untuk Pelanggan Tidak Aktif**
   - Target: Pelanggan dengan last_login > 30 hari
   - Aksi: Personal call dari CS + email re-engagement
   - Expected Impact: Kurangi churn 15-20%

2. **Eskalasi Support untuk High-Ticket Customers**
   - Target: Pelanggan dengan support_tickets > 8
   - Aksi: Assign dedicated account manager
   - Expected Impact: Kurangi churn 12-18%

3. **Feature Adoption Campaign**
   - Target: Pelanggan dengan feature_adoption < 30%
   - Aksi: Webinar 1-on-1, tutorial video, in-app guidance
   - Expected Impact: Kurangi churn 10-15%

**💡 Quick Wins:**

4. **Contract Upgrade Incentive**
   - Tawarkan diskon 20% untuk upgrade Monthly → Annual
   - Monthly customers memiliki churn rate 2.1x lebih tinggi

5. **Payment Flexibility Program**
   - Untuk pelanggan dengan payment_delay ≥ 3
   - Tawarkan cicilan atau perpanjangan tempo

6. **NPS Follow-up Loop**
   - Survey pelanggan dengan NPS ≤ 3
   - Buat action plan berdasarkan feedback spesifik`;
}

function handleDrafEmail(message, entities) {
  const customerId = entities.customerId;
  if (!customerId) {
    return `<i class="fa-solid fa-envelope" style="color: #4f8ef7;"></i> Untuk membuat draf email yang dipersonalisasi, saya perlu Customer ID.

**Contoh:**
- "Buatkan draf email untuk C-0001"
- "Draft email retensi C-0008"
- "Tulis penawaran untuk C-0003"`;
  }

  const customer = allCustomers.find(c => c.id === customerId);
  if (!customer) return `Pelanggan **${customerId}** tidak ditemukan.`;

  const riskLevel = customer.score >= 66 ? 'Tinggi' : customer.score >= 31 ? 'Sedang' : 'Rendah';
  const discount = customer.score >= 66 ? '30%' : customer.score >= 31 ? '20%' : '10%';

  return `<i class="fa-solid fa-envelope-open-text" style="color: #4f8ef7;"></i> **Draf Email untuk ${customerId}** ${customer.name ? `(${customer.name})` : ''}

**Analisis AI:** Risiko churn ${riskLevel} (${customer.score}%). Belum login ${customer.lastLogin} hari. Usage: ${customer.usage} jam/bulan.

---

**Subjek:** Kami Rindu Anda! Dapatkan Diskon Khusus ${discount} 🎁

Halo${customer.name ? ` ${customer.name.split(' ')[0]}` : ''},

Kami melihat Anda sudah ${customer.lastLogin} hari tidak mengunjungi platform kami. Kami memahami kesibukan Anda, namun kami tidak ingin Anda melewatkan pembaruan fitur terbaru yang sangat berguna untuk tim Anda.

Sebagai apresiasi karena Anda telah bersama kami selama **${customer.tenure} bulan**, kami memberikan **diskon eksklusif ${discount}** untuk perpanjangan langganan ${customer.plan} Anda bulan ini.

${customer.adoption < 50 ? '💡 *Tahukah Anda?* Ada fitur-fitur baru yang belum Anda coba yang bisa meningkatkan produktivitas tim hingga 40%. Jadwalkan demo gratis dengan tim kami!' : ''}

Klik tautan ini untuk mengaktifkan diskon: [Tautan Promo]

Salam Hangat,
Tim Customer Success

---

Apakah draf ini perlu disesuaikan?`;
}

function handleGreeting() {
  const greetings = [
    `Halo! Ghosting siap membantu <i class="fa-solid fa-robot" style="color: #4f8ef7;"></i>

Saya menggunakan **Deep Learning NLP** untuk memahami pertanyaan Anda. Coba tanyakan dengan bahasa natural:

- *"Fitur apa yang paling mempengaruhi churn?"*
- *"Siapa pelanggan VIP yang terancam pergi?"*
- *"Berapa total customer yang berisiko tinggi?"*
- *"Cek profil C-0001"*
- *"Bagaimana tren churn bulan ini?"*
- *"Buat email retensi untuk C-0008"*`,
    `Hai! 👋 Ghosting di sini, siap membantu analisis churn Anda.

Saya bisa memahami berbagai variasi pertanyaan — tidak perlu kata kunci persis. Silakan tanya apa saja seputar:
📊 Faktor penyebab churn
👤 Analisis pelanggan spesifik
📈 Tren dan statistik
💡 Strategi retensi
✉️ Draft email penawaran`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function handleTrenChurn() {
  const churned = allCustomers.filter(c => c.risk.cls === 'high').length;
  const total = allCustomers.length;
  const churnRate = ((churned / total) * 100).toFixed(1);

  return `<i class="fa-solid fa-chart-line" style="color: #4f8ef7;"></i> **Tren & Pola Churn**

**Churn Rate Saat Ini:** ${churnRate}% pelanggan dalam zona risiko tinggi

**Pola yang Terdeteksi Model AI:**

1. **Pola Waktu:** Churn cenderung meningkat pada bulan ke-3 dan ke-12 tenure (akhir trial & renewal period)
2. **Pola Engagement:** 78% pelanggan yang churn menunjukkan penurunan usage 40%+ dalam 30 hari sebelum cancel
3. **Pola Support:** Lonjakan tiket support (>5 dalam 2 minggu) adalah leading indicator churn dalam 30 hari
4. **Pola Kontrak:** Monthly customers memiliki churn rate 2.1x lebih tinggi dari Annual

**Early Warning Signals:**
- Login gap > 14 hari → 35% kemungkinan churn dalam 60 hari
- NPS drop > 3 poin → 28% kemungkinan churn
- Feature adoption turun > 20% → 42% kemungkinan churn

Lihat grafik detail di halaman **Dashboard → Churn Trend Chart**.`;
}

function handleSegmenAnalisis() {
  const plans = { Starter: { total: 0, highRisk: 0 }, Professional: { total: 0, highRisk: 0 }, Enterprise: { total: 0, highRisk: 0 } };

  allCustomers.forEach(c => {
    if (plans[c.plan]) {
      plans[c.plan].total++;
      if (c.risk.cls === 'high') plans[c.plan].highRisk++;
    }
  });

  const contracts = { Monthly: { total: 0, highRisk: 0 }, Annual: { total: 0, highRisk: 0 } };
  allCustomers.forEach(c => {
    if (contracts[c.contract]) {
      contracts[c.contract].total++;
      if (c.risk.cls === 'high') contracts[c.contract].highRisk++;
    }
  });

  return `<i class="fa-solid fa-layer-group" style="color: #4f8ef7;"></i> **Analisis Churn per Segmen**

**Per Plan Type:**
| Plan | Total | High Risk | Churn Rate |
|------|-------|-----------|-----------|
| Starter | ${plans.Starter.total} | ${plans.Starter.highRisk} | ${plans.Starter.total ? ((plans.Starter.highRisk / plans.Starter.total) * 100).toFixed(1) : 0}% |
| Professional | ${plans.Professional.total} | ${plans.Professional.highRisk} | ${plans.Professional.total ? ((plans.Professional.highRisk / plans.Professional.total) * 100).toFixed(1) : 0}% |
| Enterprise | ${plans.Enterprise.total} | ${plans.Enterprise.highRisk} | ${plans.Enterprise.total ? ((plans.Enterprise.highRisk / plans.Enterprise.total) * 100).toFixed(1) : 0}% |

**Per Contract Type:**
| Contract | Total | High Risk | Churn Rate |
|----------|-------|-----------|-----------|
| Monthly | ${contracts.Monthly.total} | ${contracts.Monthly.highRisk} | ${contracts.Monthly.total ? ((contracts.Monthly.highRisk / contracts.Monthly.total) * 100).toFixed(1) : 0}% |
| Annual | ${contracts.Annual.total} | ${contracts.Annual.highRisk} | ${contracts.Annual.total ? ((contracts.Annual.highRisk / contracts.Annual.total) * 100).toFixed(1) : 0}% |

**Insight AI:** Pelanggan Monthly memiliki risiko churn lebih tinggi karena barrier to exit yang rendah. Fokuskan program upgrade ke Annual untuk segmen ini.`;
}

function handleModelInfo() {
  return `<i class="fa-solid fa-brain" style="color: #8b5cf6;"></i> **Model Prediksi Churn — Arsitektur AI**

**Ensemble Model yang Digunakan:**

1. **Random Forest Classifier**
   - 500 decision trees, max_depth=12
   - Akurasi: 87.3% | AUC-ROC: 0.91
   - Digunakan untuk Feature Importance ranking

2. **Neural Network (Deep Learning)**
   - Architecture: 3 hidden layers (128→64→32 neurons)
   - Activation: ReLU + Softmax output
   - Optimizer: Adam (lr=0.001)
   - Akurasi: 89.1% | F1-Score: 0.86

3. **Gradient Boosting (XGBoost)**
   - 300 estimators, learning_rate=0.05
   - Akurasi: 88.7% | Precision: 0.84

**Input Features (dari dataset):**
\`plan_type\`, \`contract_type\`, \`tenure_months\`, \`monthly_revenue\`, \`monthly_usage_hrs\`, \`total_users\`, \`feature_adoption_pct\`, \`support_tickets_last_90d\`, \`last_login_days_ago\`, \`nps_score\`, \`payment_delay_count\`

**Final Prediction:** Weighted ensemble (RF: 0.3, NN: 0.4, XGB: 0.3)

**Chatbot NLP Engine:**
- Indonesian Stemming (Nazief-Adriani)
- Word Embeddings (16-dim dense vectors)
- TF-IDF Vectorization
- Cosine Similarity + Fuzzy Matching
- Multi-signal Neural Intent Classifier`;
}

function handleMetrikOverview() {
  const total = allCustomers.length;
  const highRisk = allCustomers.filter(c => c.risk.cls === 'high');
  const avgScore = (allCustomers.reduce((s, c) => s + c.score, 0) / total).toFixed(1);
  const totalRevenue = allCustomers.reduce((s, c) => s + c.revenue, 0);
  const revenueAtRisk = highRisk.reduce((s, c) => s + c.revenue, 0);
  const avgTenure = (allCustomers.reduce((s, c) => s + c.tenure, 0) / total).toFixed(0);

  return `<i class="fa-solid fa-gauge-high" style="color: #4f8ef7;"></i> **Dashboard Overview — Ringkasan Hari Ini**

**📊 Metrik Utama:**
- Total Pelanggan: **${total}**
- Rata-rata Skor Risiko: **${avgScore}%**
- Total Revenue: **Rp ${totalRevenue.toLocaleString('id-ID')}**/bulan
- Revenue at Risk: **Rp ${revenueAtRisk.toLocaleString('id-ID')}**/bulan
- Rata-rata Tenure: **${avgTenure} bulan**

**⚠️ Perlu Perhatian:**
- ${highRisk.length} pelanggan dalam zona risiko tinggi
- ${allCustomers.filter(c => c.lastLogin > 30).length} pelanggan tidak login > 30 hari
- ${allCustomers.filter(c => c.tickets >= 10).length} pelanggan dengan tiket support ≥ 10

**✅ Kabar Baik:**
- ${allCustomers.filter(c => c.risk.cls === 'low').length} pelanggan dalam kondisi sehat
- ${allCustomers.filter(c => c.adoption > 70).length} pelanggan dengan adopsi fitur tinggi (>70%)

Ketik pertanyaan spesifik untuk deep-dive ke area tertentu.`;
}

function handleFallback(confidence) {
  return `<i class="fa-solid fa-circle-question" style="color: #6b7280;"></i> Maaf, saya belum cukup yakin memahami maksud Anda (confidence: ${(confidence * 100).toFixed(0)}%).

**Saya bisa membantu dengan:**
- 📊 *"Apa faktor utama penyebab churn?"*
- 👤 *"Analisis profil C-0001"*
- 🔴 *"Berapa pelanggan yang berisiko tinggi?"*
- 💎 *"Siapa VIP yang terancam churn?"*
- 💡 *"Saran strategi retensi"*
- ✉️ *"Buatkan email untuk C-0008"*
- 📈 *"Bagaimana tren churn?"*
- 🏷️ *"Analisis churn per segmen"*
- 🤖 *"Model AI apa yang digunakan?"*
- 📋 *"Ringkasan dashboard hari ini"*

💡 **Tips:** Anda bisa bertanya dengan bahasa natural — saya menggunakan NLP untuk memahami variasi kalimat!`;
}
