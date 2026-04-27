import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { customers, getRiskClass, getFactors, getRecos } from '../api/index';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  border: '1px solid #e8e4da',
};

const sevColors = {
  critical: { border: '#e03d3d', bg: '#fdf0f0', impact: { bg: '#fdf0f0', color: '#e03d3d' }, bar: '#e03d3d' },
  warning:  { border: '#d4a017', bg: '#fdf9ee', impact: { bg: '#fdf9ee', color: '#d4a017' }, bar: '#d4a017' },
  caution:  { border: '#2da44e', bg: '#edfaf2', impact: { bg: '#edfaf2', color: '#2da44e' }, bar: '#2da44e' },
};

const recoStyles = {
  urgent:    { bg: '#fdf0f0', border: 'rgba(224,61,61,0.2)',   tag: '#e03d3d', tagColor: '#fff', label: 'URGENT' },
  important: { bg: '#fdf9ee', border: 'rgba(212,160,23,0.2)',  tag: '#d4a017', tagColor: '#1a1710', label: 'PENTING' },
  normal:    { bg: '#edfaf2', border: 'rgba(45,164,78,0.2)',   tag: '#2da44e', tagColor: '#fff', label: 'DISARANKAN' },
  info:      { bg: '#eef3ff', border: 'rgba(59,100,220,0.2)', tag: '#3b64dc', tagColor: '#fff', label: 'INFO' },
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [barWidth, setBarWidth] = useState(0);

  const customer = customers.find(c => c.id === id);

  useEffect(() => {
    // Animate bar after mount
    const timer = setTimeout(() => setBarWidth(customer?.score || 0), 100);
    return () => clearTimeout(timer);
  }, [id, customer]);

  if (!customer) {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-24" style={{ color: '#8a8270' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Pelanggan tidak ditemukan</div>
        <button className="btn btn-ghost mt-6" onClick={() => navigate('/customers')}>
          <ArrowLeft size={14} /> Kembali ke Pelanggan
        </button>
      </div>
    );
  }

  const risk = getRiskClass(customer.score);
  const factors = getFactors(customer);
  const recos = getRecos(customer);

  const infoData = [
    { label: 'Tenure',       value: `${customer.tenure} bulan` },
    { label: 'Revenue/Bln',  value: `Rp ${(customer.revenue * 16000 / 1000).toFixed(0)}rb` },
    { label: 'Penggunaan',   value: `${customer.usage} jam/bln` },
    { label: 'Adopsi Fitur', value: `${customer.adoption}%` },
    { label: 'Tiket Support',value: `${customer.tickets} tiket` },
    { label: 'Last Login',   value: `${customer.lastLogin} hari lalu` },
    { label: 'NPS Score',    value: `${customer.nps}/10` },
    { label: 'Status',       value: customer.churned ? 'Churned' : 'Aktif', color: customer.churned ? '#e03d3d' : '#2da44e' },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-7">
        <div className="flex items-center gap-3.5">
          <button
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} /> Kembali
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
              Detail — {customer.name}
            </h1>
            <p style={{ fontSize: 13, color: '#8a8270', marginTop: 3, marginBottom: 0 }}>
              Analisis mendalam faktor risiko churn dan rekomendasi aksi
            </p>
          </div>
        </div>
        <button className="btn btn-accent">
          <Download size={14} /> Export Laporan
        </button>
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Profile Panel ── */}
        <div>
          {/* Profile Card */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            {/* Avatar & Name */}
            <div className="flex items-center gap-3.5 mb-5">
              <div
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: '#f7f0dd', border: '2px solid #c9a84c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}
              >
                {customer.avatar}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{customer.name}</div>
                <div style={{ fontSize: 12, color: '#8a8270', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                  {customer.id} · {customer.plan} · {customer.contract}
                </div>
              </div>
            </div>

            {/* Score Bar */}
            <div
              style={{
                background: '#f5f3ee', borderRadius: 10,
                padding: '16px 18px', border: '1px solid #e8e4da',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span style={{ fontSize: 12, color: '#8a8270', fontWeight: 500 }}>Skor Risiko Churn</span>
                <span style={{ fontSize: 26, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: risk.color }}>
                  {customer.score}
                </span>
              </div>
              <div style={{ height: 8, background: '#e8e4da', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                <div
                  style={{
                    height: '100%', borderRadius: 6,
                    background: risk.color,
                    width: `${barWidth}%`,
                    transition: 'width 0.8s cubic-bezier(0.23,1,0.32,1)',
                  }}
                />
              </div>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11.5, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  background: risk.cls === 'high' ? '#fdf0f0' : risk.cls === 'med' ? '#fdf9ee' : '#edfaf2',
                  color: risk.color,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: risk.color, display: 'inline-block' }} />
                {risk.label}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Info Pelanggan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {infoData.map(item => (
                <div
                  key={item.label}
                  style={{
                    background: '#f5f3ee', borderRadius: 9,
                    padding: '10px 13px', border: '1px solid #e8e4da',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#8a8270', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: item.color || '#1a1710' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Factors + Recos ── */}
        <div>
          {/* Factors */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div
              className="flex items-center gap-2"
              style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}
            >
              🔍 Faktor Penyebab Churn
            </div>
            <div className="flex flex-col gap-2.5">
              {factors.map((f, i) => {
                const s = sevColors[f.sev];
                return (
                  <div
                    key={i}
                    style={{
                      background: s.bg, borderRadius: 10,
                      padding: '13px 15px',
                      border: '1px solid #e8e4da',
                      borderLeft: `3px solid ${s.border}`,
                    }}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 20,
                          fontFamily: 'DM Mono, monospace',
                          ...s.impact,
                        }}
                      >
                        Impact: {f.impact}%
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8a8270' }}>{f.detail}</div>
                    <div style={{ height: 4, background: '#e8e4da', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${f.bar}%`, background: s.bar, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4" style={{ fontSize: 13.5, fontWeight: 700 }}>
              💡 Rekomendasi Aksi Retention
              <span
                style={{
                  fontSize: 11, fontWeight: 400,
                  background: '#f7f0dd', color: '#c9a84c',
                  padding: '2px 8px', borderRadius: 10, marginLeft: 4,
                }}
              >
                AI Generated
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {recos.map((r, i) => {
                const rs = recoStyles[r.type];
                return (
                  <div
                    key={i}
                    style={{
                      background: rs.bg, borderRadius: 10,
                      padding: '14px 16px',
                      border: `1px solid ${rs.border}`,
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2, width: 22, textAlign: 'center' }}>
                      {r.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                        {r.title}
                        <span
                          style={{
                            fontSize: 10, fontWeight: 700,
                            padding: '2px 7px', borderRadius: 20,
                            marginLeft: 8, verticalAlign: 'middle',
                            background: rs.tag, color: rs.tagColor,
                          }}
                        >
                          {rs.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8a8270', lineHeight: 1.5 }}>{r.desc}</div>
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
