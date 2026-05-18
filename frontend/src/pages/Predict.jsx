import React, { useState } from 'react';
import Badge from '../components/ui/Badge';
import { fetchPredict } from '../api/index';

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle = {
  background: 'var(--color-card)',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: 'var(--color-card-shadow)',
  border: '1px solid var(--color-border)',
};

const inputStyle = {
  width: '100%',
  background: 'var(--color-input)',
  border: '1px solid var(--color-border-input)',
  borderRadius: 9,
  padding: '10px 14px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--color-subtle)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

// ── Field definitions ─────────────────────────────────────────────────────────
const fields = [
  { key: 'total_users',            label: 'Jumlah Pengguna (users)',      placeholder: '5',       hint: 'Total akun user aktif' },
  { key: 'tenure_months',          label: 'Tenure (bulan)',               placeholder: '12',      hint: 'Lama berlangganan dalam bulan' },
  { key: 'monthly_usage_hrs',      label: 'Penggunaan (jam/bulan)',       placeholder: '30',      hint: 'Total jam pemakaian produk/bulan' },
  { key: 'feature_adoption_pct',   label: 'Adopsi Fitur (%)',             placeholder: '60',      hint: 'Persentase fitur yang digunakan (0–100)' },
  { key: 'days_since_last_login',  label: 'Hari Sejak Login Terakhir',    placeholder: '15',      hint: 'Berapa hari lalu terakhir login' },
  { key: 'total_tickets',          label: 'Total Tiket Support',          placeholder: '3',       hint: 'Jumlah tiket support dalam 90 hari' },
  { key: 'high_priority_tickets',  label: 'Tiket Prioritas Tinggi',       placeholder: '1',       hint: 'Tiket dengan severity tinggi/critical' },
  { key: 'avg_nps_score',          label: 'NPS Score (0–10)',             placeholder: '7',       hint: 'Rata-rata NPS customer' },
  { key: 'total_payment_value',    label: 'Total Nilai Pembayaran (Rp)',  placeholder: '5000000', hint: 'Jumlah total pembayaran kumulatif' },
  { key: 'avg_payment_delay',      label: 'Rata-rata Keterlambatan Bayar',placeholder: '2',       hint: 'Rata-rata hari keterlambatan bayar' },
  { key: 'total_delayed_payments', label: 'Jumlah Keterlambatan Bayar',   placeholder: '1',       hint: 'Berapa kali terjadi keterlambatan' },
];

function getRiskFromLevel(level) {
  if (level === 'high') return { cls: 'high', label: 'Risiko Tinggi',  color: '#e03d3d' };
  if (level === 'med')  return { cls: 'med',  label: 'Risiko Sedang',  color: '#d4a017' };
  return                       { cls: 'low',  label: 'Risiko Rendah',  color: '#2da44e' };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Predict() {
  const initialForm = fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const [form, setForm]       = useState(initialForm);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Validate all fields
    const body = {};
    for (const f of fields) {
      const raw = form[f.key];
      const num = parseFloat(raw);
      if (isNaN(num)) {
        setError(`Field "${f.label}" harus diisi dengan angka.`);
        setLoading(false);
        return;
      }
      body[f.key] = num;
    }

    try {
      const data = await fetchPredict(body);
      setResult(data);
    } catch (err) {
      setError(`Gagal menghubungi server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setResult(null);
    setError(null);
  };

  const riskObj = result ? getRiskFromLevel(result.risk.level) : null;
  const probPct = result ? Math.round(result.churn_probability * 100) : 0;

  return (
    <div className="fade-in">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Prediksi Churn</h1>
          <p className="page-subtitle">
            Prediksi risiko churn menggunakan model Random Forest yang telah dilatih
          </p>
        </div>
        {/* Model badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)',
          borderRadius: 10, padding: '8px 14px',
          fontSize: 12.5, color: '#4f8ef7', fontWeight: 600,
        }}>
          <i className="fa-solid fa-robot"></i> Random Forest Model &nbsp;
          <span style={{ fontWeight: 400, color: '#93bbfb' }}>AUC ≈ 0.92</span>
        </div>
      </div>

      <div className="grid-predict">
        {/* ── Input Form ──────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>Data Pelanggan</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20 }}>
            Masukkan 11 fitur pelanggan untuk prediksi churn
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  id={`field-${f.key}`}
                  type="number"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  style={inputStyle}
                  title={f.hint}
                  onFocus={e  => e.target.style.borderColor = '#4f8ef7'}
                  onBlur={e   => e.target.style.borderColor = 'var(--color-border-input)'}
                  min="0"
                  step="any"
                />
                {f.hint && (
                  <div style={{ fontSize: 11, color: 'var(--color-subtle)', marginTop: 3 }}>
                    <i className="fa-regular fa-lightbulb"></i> {f.hint}
                  </div>
                )}
              </div>
            ))}

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 9, padding: '10px 14px',
                fontSize: 12.5, color: '#dc2626',
              }}>
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                id="btn-predict"
                className="btn btn-accent"
                style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14 }}
                onClick={handlePredict}
                disabled={loading}
              >
                {loading ? <><i className="fa-solid fa-hourglass-half fa-spin"></i> Memproses...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> Prediksi Sekarang</>}
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '12px 16px', fontSize: 13 }}
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Result Panel ────────────────────────────────────────────────────── */}
        <div>
          {!result ? (
            <div style={{
              ...cardStyle,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 360, color: 'var(--color-subtle)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}><i className="fa-solid fa-wand-magic-sparkles"></i></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Hasil Prediksi</div>
              <div style={{ fontSize: 13, marginTop: 4, maxWidth: 260, color: 'var(--color-muted)' }}>
                Lengkapi semua field di kiri dan klik "Prediksi Sekarang" untuk melihat analisis model
              </div>
              <div style={{
                marginTop: 20, padding: '10px 18px',
                background: 'rgba(79,142,247,0.12)', borderRadius: 9,
                fontSize: 12, color: '#4f8ef7',
                border: '1px solid rgba(79,142,247,0.2)',
              }}>
                <i className="fa-solid fa-robot"></i> Powered by Random Forest Classifier
              </div>
            </div>
          ) : (
            <>
              {/* ── Probability Score Card ─────────────────────────────────── */}
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 16, color: 'var(--color-text)' }}>
                  🎯 Hasil Prediksi Model
                </div>

                {/* Score display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 18 }}>
                  {/* Probability circle */}
                  <div style={{
                    width: 96, height: 96, borderRadius: 16,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: result.risk.level === 'high' ? 'rgba(220,38,38,0.12)'
                              : result.risk.level === 'med'  ? 'rgba(217,119,6,0.12)' : 'rgba(22,163,74,0.12)',
                    border: `2.5px solid ${result.risk.color}`,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: 30, fontWeight: 700,
                      fontFamily: 'DM Mono, monospace',
                      color: result.risk.color, lineHeight: 1,
                    }}>
                      {probPct}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-subtle)', marginTop: 3 }}>
                      churn prob.
                    </span>
                  </div>

                  {/* Risk label */}
                  <div>
                    <Badge riskObj={riskObj} />
                    <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 10, lineHeight: 1.5 }}>
                      {result.risk.level === 'high'
                        ? <><i className="fa-solid fa-triangle-exclamation"></i> Pelanggan ini berisiko tinggi untuk churn. Segera ambil tindakan!</>
                        : result.risk.level === 'med'
                        ? <><i className="fa-solid fa-eye"></i> Monitor pelanggan ini secara berkala dan tawarkan bantuan.</>
                        : <><i className="fa-solid fa-check"></i> Pelanggan dalam kondisi baik. Pertahankan layanan.</>
                      }
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-subtle)', marginTop: 6 }}>
                      Prediksi: <strong style={{ color: result.churn_prediction === 1 ? '#dc2626' : '#16a34a' }}>
                        {result.churn_prediction === 1 ? 'CHURN' : 'TIDAK CHURN'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Probability bar */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-subtle)', marginBottom: 6 }}>
                    <span>Probabilitas Churn</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: result.risk.color }}>
                      {(result.churn_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 10, background: 'var(--color-hover)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${probPct}%`,
                      background: `linear-gradient(90deg, ${result.risk.color}88, ${result.risk.color})`,
                      borderRadius: 6,
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>
              </div>

              {/* ── Top Feature Importances ──────────────────────────────────── */}
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
                  📊 Faktor Paling Berpengaruh
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.top_features.map((feat, i) => {
                    const pct = Math.round(feat.importance * 100);
                    const barColors = ['#4f8ef7', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'];
                    return (
                      <div key={feat.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)' }}>
                            {i + 1}. {feat.label}
                          </span>
                          <span style={{
                            fontSize: 11.5, fontFamily: 'DM Mono, monospace',
                            fontWeight: 700, color: barColors[i],
                          }}>
                            {(feat.importance * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--color-hover)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, pct * 5)}%`,
                            background: barColors[i],
                            borderRadius: 4,
                            transition: 'width 0.6s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Engineered Features ──────────────────────────────────────── */}
              <div style={cardStyle}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
                  🔧 Fitur Turunan (Computed)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'high_priority_ratio', label: 'Rasio Tiket Prioritas',  fmt: v => (v * 100).toFixed(1) + '%' },
                    { key: 'engagement_score',    label: 'Skor Engagement',        fmt: v => v.toFixed(3) },
                    { key: 'payment_risk_score',  label: 'Skor Risiko Pembayaran', fmt: v => v.toFixed(2) },
                    { key: 'revenue_per_user',    label: 'Revenue per User',       fmt: v => 'Rp ' + v.toLocaleString('id-ID', { maximumFractionDigits: 0 }) },
                    { key: 'inactivity_ratio',    label: 'Rasio Tidak Aktif',      fmt: v => v.toFixed(3) },
                  ].map(item => (
                    <div key={item.key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: 'var(--color-input)',
                      borderRadius: 8, border: '1px solid var(--color-border)',
                    }}>
                      <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{item.label}</span>
                      <span style={{
                        fontSize: 12.5, fontFamily: 'DM Mono, monospace',
                        fontWeight: 700, color: 'var(--color-text)',
                      }}>
                        {item.fmt(result.engineered[item.key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
