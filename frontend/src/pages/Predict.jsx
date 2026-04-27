import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customers, getRiskClass, calcScore, getFactors, getRecos } from '../api/index';
import Navbar from '../components/layout/Navbar';
import Badge from '../components/ui/Badge';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  border: '1px solid #e8e4da',
};

const inputStyle = {
  width: '100%',
  background: '#f5f3ee',
  border: '1px solid #e8e4da',
  borderRadius: 9,
  padding: '10px 14px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: 13.5,
  color: '#1a1710',
  outline: 'none',
};

const fields = [
  { key: 'tenure',    label: 'Tenure (bulan)',       type: 'number', placeholder: '12' },
  { key: 'usage',     label: 'Penggunaan (jam/bln)', type: 'number', placeholder: '30' },
  { key: 'adoption',  label: 'Adopsi Fitur (%)',     type: 'number', placeholder: '60' },
  { key: 'tickets',   label: 'Jumlah Tiket Support', type: 'number', placeholder: '2' },
  { key: 'lastLogin', label: 'Last Login (hari lalu)',type: 'number', placeholder: '15' },
  { key: 'nps',       label: 'NPS Score (0-10)',     type: 'number', placeholder: '7' },
  { key: 'delay',     label: 'Keterlambatan Bayar',  type: 'number', placeholder: '0' },
];

export default function Predict() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenure: '', usage: '', adoption: '', tickets: '',
    lastLogin: '', nps: '', delay: '',
    contract: 'Monthly', plan: 'Starter',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handlePredict = () => {
    setLoading(true);
    setTimeout(() => {
      const input = {
        tenure:    parseFloat(form.tenure)    || 12,
        usage:     parseFloat(form.usage)     || 30,
        adoption:  parseFloat(form.adoption)  || 60,
        tickets:   parseFloat(form.tickets)   || 0,
        lastLogin: parseFloat(form.lastLogin) || 7,
        nps:       parseFloat(form.nps)       || 7,
        delay:     parseFloat(form.delay)     || 0,
        contract:  form.contract,
        plan:      form.plan,
      };
      const score = calcScore(input);
      const risk  = getRiskClass(score);
      const factors = getFactors(input);
      setResult({ score, risk, factors, input });
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fade-in">
      <Navbar
        title="Prediksi Churn"
        subtitle="Prediksi risiko churn pelanggan baru secara manual"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Input form */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Data Pelanggan</div>
          <div style={{ fontSize: 12, color: '#8a8270', marginBottom: 20 }}>Masukkan data pelanggan untuk prediksi skor risiko</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Contract & Plan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#8a8270', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Kontrak
                </label>
                <select
                  value={form.contract}
                  onChange={e => handleChange('contract', e.target.value)}
                  style={inputStyle}
                >
                  <option>Monthly</option>
                  <option>Annual</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#8a8270', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Plan
                </label>
                <select
                  value={form.plan}
                  onChange={e => handleChange('plan', e.target.value)}
                  style={inputStyle}
                >
                  <option>Starter</option>
                  <option>Professional</option>
                  <option>Enterprise</option>
                </select>
              </div>
            </div>

            {/* Numeric fields */}
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#8a8270', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#c9a84c'}
                  onBlur={e => e.target.style.borderColor = '#e8e4da'}
                />
              </div>
            ))}

            <button
              className="btn btn-accent w-full justify-center"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4 }}
              onClick={handlePredict}
              disabled={loading}
            >
              {loading ? '⏳ Memproses...' : '🔮 Prediksi Sekarang'}
            </button>
          </div>
        </div>

        {/* Result */}
        <div>
          {!result ? (
            <div
              style={{
                ...cardStyle,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                minHeight: 300, color: '#8a8270', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔮</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Hasil Prediksi</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Isi form di kiri dan klik "Prediksi Sekarang"</div>
            </div>
          ) : (
            <>
              {/* Score result */}
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 16 }}>🎯 Hasil Prediksi Risiko Churn</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 80, height: 80, borderRadius: 14,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      background: result.risk.cls === 'high' ? '#fdf0f0' : result.risk.cls === 'med' ? '#fdf9ee' : '#edfaf2',
                      border: `2px solid ${result.risk.color}`,
                    }}
                  >
                    <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: result.risk.color, lineHeight: 1 }}>
                      {result.score}
                    </span>
                    <span style={{ fontSize: 10, color: '#8a8270', marginTop: 2 }}>/ 100</span>
                  </div>
                  <div>
                    <Badge riskObj={result.risk} />
                    <div style={{ fontSize: 12, color: '#8a8270', marginTop: 8 }}>
                      {result.risk.cls === 'high'
                        ? 'Pelanggan ini berisiko tinggi untuk churn. Segera ambil tindakan!'
                        : result.risk.cls === 'med'
                        ? 'Monitor pelanggan ini secara berkala.'
                        : 'Pelanggan dalam kondisi baik. Pertahankan layanan.'
                      }
                    </div>
                  </div>
                </div>
                <div style={{ height: 8, background: '#e8e4da', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${result.score}%`, background: result.risk.color, borderRadius: 6, transition: 'width 0.8s' }} />
                </div>
              </div>

              {/* Factors */}
              <div style={cardStyle}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>🔍 Faktor Risiko</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.factors.map((f, i) => {
                    const sevColor = f.sev === 'critical' ? '#e03d3d' : f.sev === 'warning' ? '#d4a017' : '#2da44e';
                    return (
                      <div key={i} style={{
                        background: '#f5f3ee', borderRadius: 10, padding: '12px 14px',
                        border: '1px solid #e8e4da', borderLeft: `3px solid ${sevColor}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: sevColor, fontWeight: 700 }}>
                            Impact: {f.impact}%
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#8a8270' }}>{f.detail}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
