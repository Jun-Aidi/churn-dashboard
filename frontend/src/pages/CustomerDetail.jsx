import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRiskClass, getFactors, getRecos } from '../api/index';
import { useCustomer } from '../hooks/useCustomers';

const card = { background: 'var(--color-card)', borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--color-card-shadow)', border: '1px solid var(--color-border)' };

const sevColors = {
  critical: { border: '#dc2626', bg: 'rgba(220,38,38,0.08)', impact: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626' }, bar: '#dc2626' },
  warning: { border: '#d97706', bg: 'rgba(217,119,6,0.08)', impact: { bg: 'rgba(217,119,6,0.15)', color: '#d97706' }, bar: '#d97706' },
  caution: { border: '#16a34a', bg: 'rgba(22,163,74,0.08)', impact: { bg: 'rgba(22,163,74,0.15)', color: '#16a34a' }, bar: '#16a34a' },
};
const recoStyles = {
  urgent: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', tag: '#dc2626', label: 'URGENT' },
  important: { bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)', tag: '#d97706', label: 'PENTING' },
  normal: { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.2)', tag: '#16a34a', label: 'DISARANKAN' },
  info: { bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', tag: '#4f8ef7', label: 'INFO' },
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [barWidth, setBarWidth] = useState(0);
  const { customer, loading, error } = useCustomer(id);

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(customer?.score || 0), 100);
    return () => clearTimeout(t);
  }, [id, customer]);

  if (loading) return (
    <div className="fade-in flex flex-col items-center justify-center py-24" style={{ color: 'var(--color-subtle)' }}>
      <div className="text-5xl mb-4"><i className="fa-solid fa-circle-notch fa-spin"></i></div>
      <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Memuat data pelanggan...</div>
    </div>
  );

  if (error || !customer) return (
    <div className="fade-in flex flex-col items-center justify-center py-24" style={{ color: 'var(--color-subtle)' }}>
      <div className="text-5xl mb-4">{error ? <i className="fa-solid fa-triangle-exclamation"></i> : <i className="fa-solid fa-magnifying-glass"></i>}</div>
      <div className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{error ? `Gagal memuat: ${error}` : 'Pelanggan tidak ditemukan'}</div>
      <button className="btn btn-ghost mt-6" onClick={() => navigate('/customers')}>
        <i className="fa-solid fa-arrow-left text-xs"></i> Kembali ke Pelanggan
      </button>
    </div>
  );

  const risk = getRiskClass(customer.score);
  const factors = getFactors(customer);
  const recos = getRecos(customer);
  const rc = risk.cls === 'high' ? '#dc2626' : risk.cls === 'med' ? '#d97706' : '#16a34a';
  const rb = risk.cls === 'high' ? 'rgba(220,38,38,0.15)' : risk.cls === 'med' ? 'rgba(217,119,6,0.15)' : 'rgba(22,163,74,0.15)';

  const infoData = [
    { label: 'Tenure', value: `${customer.tenure} bulan` },
    { label: 'Revenue/Bln', value: `Rp ${(customer.revenue * 16000 / 1000).toFixed(0)}rb` },
    { label: 'Penggunaan', value: `${customer.usage} jam/bln` },
    { label: 'Adopsi Fitur', value: `${customer.adoption}%` },
    { label: 'Tiket Support', value: `${customer.tickets} tiket` },
    { label: 'Last Login', value: `${customer.lastLogin} hari lalu` },
    { label: 'NPS Score', value: `${customer.nps}/10` },
    { label: 'Status', value: customer.churned ? 'Churned' : 'Aktif', color: customer.churned ? '#dc2626' : '#16a34a' },
  ];

  return (
    <div className="fade-in">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3.5">
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate(-1)}>
            <i className="fa-solid fa-angle-left text-xs"></i> Kembali
          </button>
          <div>
            <h1 className="page-title">Detail — {customer.name}</h1>
            <p className="page-subtitle">Analisis mendalam faktor risiko churn dan rekomendasi aksi</p>
          </div>
        </div>
        <button className="btn btn-accent"><i className="fa-solid fa-download text-xs"></i> Export Laporan</button>
      </div>

      <div className="grid-detail">
        {/* Left */}
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-xl flex-shrink-0 text-white font-bold"
                style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)' }}>
                {customer.name?.charAt(0) || '?'}
              </div>
              <div>
                <div className="text-[17px] font-bold" style={{ color: 'var(--color-text)' }}>{customer.name}</div>
                <div className="text-[11.5px] font-mono mt-0.5" style={{ color: 'var(--color-subtle)' }}>
                  {customer.id} · {customer.plan} · {customer.contract}
                </div>
              </div>
            </div>
            <div className="rounded-[10px] p-4 border" style={{ background: 'var(--color-input)', borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--color-subtle)' }}>Skor Risiko Churn</span>
                <span className="text-[28px] font-bold font-mono" style={{ color: rc }}>{customer.score}</span>
              </div>
              <div className="h-2 rounded-md overflow-hidden mb-2.5" style={{ background: 'var(--color-hover)' }}>
                <div className="h-full rounded-md" style={{ width: `${barWidth}%`, background: rc, transition: 'width 0.8s cubic-bezier(0.23,1,0.32,1)' }} />
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full" style={{ background: rb, color: rc }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: rc }} /> {risk.label}
              </span>
            </div>
          </div>

          <div style={card}>
            <div className="text-[13.5px] font-bold mb-3.5" style={{ color: 'var(--color-text)' }}>Info Pelanggan</div>
            <div className="flex flex-col gap-2">
              {infoData.map(item => (
                <div key={item.label} className="rounded-[9px] px-3 py-2.5 border flex justify-between items-center"
                  style={{ background: 'var(--color-input)', borderColor: 'var(--color-border)' }}>
                  <div className="text-[11px] uppercase tracking-[0.5px]" style={{ color: 'var(--color-subtle)' }}>{item.label}</div>
                  <div className="text-[13.5px] font-semibold" style={{ color: item.color || 'var(--color-text)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div className="text-[13.5px] font-bold mb-3.5" style={{ color: 'var(--color-text)' }}>
              <i className="fa-solid fa-magnifying-glass text-[#4f8ef7] mr-1"></i> Faktor Penyebab Churn
            </div>
            <div className="flex flex-col gap-2.5">
              {factors.map((f, i) => {
                const s = sevColors[f.sev];
                return (
                  <div key={i} className="rounded-[10px] p-[13px_15px]"
                    style={{ background: s.bg, border: `1px solid var(--color-border)`, borderLeft: `3px solid ${s.border}` }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{f.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full font-mono" style={s.impact}>Impact: {f.impact}%</span>
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{f.detail}</div>
                    <div className="h-1 rounded mt-2.5 overflow-hidden" style={{ background: 'var(--color-hover)' }}>
                      <div className="h-full rounded" style={{ width: `${f.bar}%`, background: s.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card}>
            <div className="text-[13.5px] font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              <i className="fa-solid fa-lightbulb text-yellow-400 mr-1.5"></i> Rekomendasi Aksi Retention
            </div>
            <div className="flex flex-col gap-2.5">
              {recos.map((r, i) => {
                const rs = recoStyles[r.type];
                return (
                  <div key={i} className="rounded-[10px] p-[14px_16px] flex gap-3 items-start"
                    style={{ background: rs.bg, border: `1px solid ${rs.border}` }}>
                    <div className="text-[18px] flex-shrink-0 mt-0.5 w-6 text-center">
                      <i className={r.icon} style={{ color: rs.tag }}></i>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                        {r.title}
                        <span className="text-[10px] font-bold px-[7px] py-0.5 rounded-full ml-2 align-middle" style={{ background: rs.tag, color: '#fff' }}>{rs.label}</span>
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{r.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
