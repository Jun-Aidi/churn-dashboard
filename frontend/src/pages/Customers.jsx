import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskClass } from '../api/index';
import { useCustomers } from '../hooks/useCustomers';
import Badge from '../components/ui/Badge';

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const { customers, counts, total, loading, error } = useCustomers();

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
    { key: 'all',  label: `Semua (${total})` },
    { key: 'high', label: `Risiko Tinggi (${counts.high || 0})` },
    { key: 'med',  label: `Sedang (${counts.med || 0})` },
    { key: 'low',  label: `Rendah (${counts.low || 0})` },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pelanggan</h1>
          <p className="page-subtitle">Semua pelanggan beserta skor risiko churn</p>
        </div>
        <div className="flex gap-2.5">
          <button className="btn btn-ghost"><i className="fa-solid fa-download text-xs"></i> Export CSV</button>
          <button className="btn btn-accent"><i className="fa-solid fa-plus text-xs"></i> Tambah Pelanggan</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] pointer-events-none" style={{ color: 'var(--color-subtle)' }}></i>
          <input type="text" placeholder="Cari nama atau customer ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[9px] py-2.5 pl-9 pr-4 font-[inherit] text-[13px] outline-none border"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }} />
        </div>
        <div className="flex overflow-hidden rounded-[9px] border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border-input)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className="px-4 py-2.5 text-[12.5px] border-none cursor-pointer font-[inherit] whitespace-nowrap transition-all duration-150"
              style={{
                fontWeight: activeFilter === tab.key ? 600 : 500,
                background: activeFilter === tab.key ? '#4f8ef7' : 'transparent',
                color: activeFilter === tab.key ? '#fff' : 'var(--color-muted)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--color-subtle)' }}>
          <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data pelanggan...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-red-600">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i> Gagal memuat data: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--color-subtle)' }}>Tidak ada pelanggan yang ditemukan.</div>
      ) : (
        <div className="grid-customers">
          {filtered.slice(0, 100).map(c => {
            const risk = getRiskClass(c.score);
            const bc = risk.cls === 'high' ? '#dc2626' : risk.cls === 'med' ? '#d97706' : '#16a34a';
            return (
              <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                className="rounded-[14px] px-5 py-[18px] cursor-pointer transition-all duration-[180ms] hover:-translate-y-0.5"
                style={{
                  background: 'var(--color-card)',
                  boxShadow: 'var(--color-card-shadow)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${bc}`,
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--color-card-shadow)'}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</div>
                    <div className="text-[11.5px] font-mono mt-0.5" style={{ color: 'var(--color-subtle)' }}>{c.id}</div>
                  </div>
                  <div className="text-[28px] font-bold font-mono leading-none" style={{ color: risk.color }}>{c.score}</div>
                </div>
                <div className="mb-2">
                  <div className="h-[5px] rounded overflow-hidden" style={{ background: 'var(--color-hover)' }}>
                    <div className="h-full rounded" style={{ width: `${c.score}%`, background: bc }} />
                  </div>
                </div>
                <div className="mb-2"><Badge riskObj={risk} /></div>
                <div className="flex gap-2.5 flex-wrap text-xs mt-2" style={{ color: 'var(--color-subtle)' }}>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-box text-[10px]"></i> {c.plan}</span>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-clock text-[10px]"></i> {c.tenure} bln</span>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-ticket text-[10px]"></i> {c.tickets} tiket</span>
                </div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: c.churned ? '#fef2f2' : '#f0fdf4', color: c.churned ? '#dc2626' : '#16a34a' }}>
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
