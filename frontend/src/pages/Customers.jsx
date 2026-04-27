import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Search } from 'lucide-react';
import { customers, getRiskClass } from '../api/index';
import Badge from '../components/ui/Badge';
import Navbar from '../components/layout/Navbar';

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const counts = customers.reduce((acc, c) => {
    const { cls } = getRiskClass(c.score);
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    const { cls } = getRiskClass(c.score);
    if (activeFilter === 'all')  return matchQ;
    if (activeFilter === 'high') return matchQ && cls === 'high';
    if (activeFilter === 'med')  return matchQ && cls === 'med';
    if (activeFilter === 'low')  return matchQ && cls === 'low';
    return matchQ;
  });

  const tabs = [
    { key: 'all',  label: `Semua (${customers.length})` },
    { key: 'high', label: `Risiko Tinggi (${counts.high || 0})` },
    { key: 'med',  label: `Sedang (${counts.med || 0})` },
    { key: 'low',  label: `Rendah (${counts.low || 0})` },
  ];

  return (
    <div className="fade-in">
      <Navbar
        title="Pelanggan"
        subtitle="Semua pelanggan beserta skor risiko churn"
        actions={
          <>
            <button className="btn btn-ghost">
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-accent">
              <Plus size={14} /> Tambah Pelanggan
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search
            size={13}
            style={{
              position: 'absolute', left: 14,
              top: '50%', transform: 'translateY(-50%)',
              color: '#8a8270', pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Cari nama atau customer ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e8e4da',
              borderRadius: 9,
              padding: '10px 16px 10px 36px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13.5,
              color: '#1a1710',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#c9a84c'}
            onBlur={e => e.target.style.borderColor = '#e8e4da'}
          />
        </div>

        {/* Tab filter */}
        <div
          className="flex overflow-hidden"
          style={{
            background: '#ffffff',
            border: '1px solid #e8e4da',
            borderRadius: 9,
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding: '9px 16px',
                fontSize: 12.5,
                fontWeight: activeFilter === tab.key ? 600 : 500,
                cursor: 'pointer',
                border: 'none',
                background: activeFilter === tab.key ? '#c9a84c' : 'transparent',
                color: activeFilter === tab.key ? '#1a1710' : '#8a8270',
                fontFamily: 'DM Sans, sans-serif',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (activeFilter !== tab.key) {
                  e.currentTarget.style.background = '#f5f3ee';
                  e.currentTarget.style.color = '#1a1710';
                }
              }}
              onMouseLeave={e => {
                if (activeFilter !== tab.key) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#8a8270';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#8a8270', padding: '48px 0', fontSize: 14 }}>
          Tidak ada pelanggan yang ditemukan.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {filtered.map(c => {
            const risk = getRiskClass(c.score);
            const borderColor = risk.cls === 'high' ? '#e03d3d' : risk.cls === 'med' ? '#d4a017' : '#2da44e';
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: '18px 20px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  border: '1px solid #e8e4da',
                  borderLeft: `3px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.11)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
                }}
              >
                {/* Top row */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: '#8a8270', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{c.id}</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'DM Mono, monospace', lineHeight: 1, color: risk.color }}>
                    {c.score}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 5, background: '#e8e4da', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.score}%`, background: risk.color, borderRadius: 4 }} />
                  </div>
                </div>

                {/* Badge */}
                <div style={{ marginBottom: 8 }}>
                  <Badge riskObj={risk} />
                </div>

                {/* Meta */}
                <div className="flex gap-2.5 flex-wrap" style={{ fontSize: 12, color: '#8a8270', marginTop: 8 }}>
                  <span className="flex items-center gap-1">📦 {c.plan}</span>
                  <span className="flex items-center gap-1">🕐 {c.tenure} bln</span>
                  <span className="flex items-center gap-1">🎫 {c.tickets} tiket</span>
                </div>

                {/* Churned tag */}
                <div style={{ marginTop: 10 }}>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                      background: c.churned ? '#fdf0f0' : '#edfaf2',
                      color: c.churned ? '#e03d3d' : '#2da44e',
                    }}
                  >
                    {c.churned ? '✕ Churned' : '✓ Aktif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
