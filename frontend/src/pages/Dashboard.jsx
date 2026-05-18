import React, { useState } from 'react';
import { getRiskClass } from '../api/index';
import { useCustomers } from '../hooks/useCustomers';
import Table from '../components/ui/Table';
import ChurnTrendChart from '../components/charts/ChurnTrendChart';
import RiskDonutChart from '../components/charts/RiskDonutChart';

const card = {
  background: 'var(--color-card)',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: 'var(--color-card-shadow)',
  border: '1px solid var(--color-border)',
};

const scoreTiers = [
  { range: '66–100', name: 'Risiko Tinggi', tag: 'Urgent',  cls: 'high', borderColor: 'rgba(220,38,38,0.35)',  bg: 'rgba(220,38,38,0.08)',  color: '#dc2626' },
  { range: '31–65',  name: 'Risiko Sedang', tag: 'Monitor', cls: 'med',  borderColor: 'rgba(217,119,6,0.35)',  bg: 'rgba(217,119,6,0.08)',  color: '#d97706' },
  { range: '0–30',   name: 'Risiko Rendah', tag: 'Stabil',  cls: 'low',  borderColor: 'rgba(22,163,74,0.35)',  bg: 'rgba(22,163,74,0.08)',  color: '#16a34a' },
];

const statCards = (counts, total) => [
  { icon: 'fa-solid fa-users',               iconBg: 'rgba(79,142,247,0.15)',  iconColor: '#4f8ef7', label: 'Total Pelanggan', value: total,            badge: '+5.2%', pos: true },
  { icon: 'fa-solid fa-triangle-exclamation',iconBg: 'rgba(220,38,38,0.15)',   iconColor: '#dc2626', label: 'Risiko Tinggi',  value: counts.high || 0,  badge: '+12%',  pos: false, vc: '#dc2626' },
  { icon: 'fa-solid fa-chart-line',          iconBg: 'rgba(217,119,6,0.15)',   iconColor: '#d97706', label: 'Risiko Sedang',  value: counts.med  || 0,  badge: '-3%',   pos: true,  vc: '#d97706' },
  { icon: 'fa-solid fa-circle-check',        iconBg: 'rgba(22,163,74,0.15)',   iconColor: '#16a34a', label: 'Risiko Rendah',  value: counts.low  || 0,  badge: '+8%',   pos: true,  vc: '#16a34a' },
];

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { customers, counts, total, loading } = useCustomers();

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const name = (c.name || c.id || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    const matchQ = name.includes(q) || id.includes(q);
    if (filter === 'all') return matchQ;
    const { cls } = getRiskClass(c.score);
    return matchQ && cls === filter;
  });

  const cards = statCards(counts, total);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Monitor dan prediksi risiko churn pelanggan Anda</p>
        </div>
        <div className="flex gap-2.5">
          <button className="btn btn-ghost"><i className="fa-solid fa-download text-xs"></i> Export</button>
          <button className="btn btn-accent"><i className="fa-solid fa-plus text-xs"></i> Tambah Pelanggan</button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-6 text-sm" style={{ color: 'var(--color-subtle)' }}>
          <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data...
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-stat-cards">
        {cards.map((c, i) => (
          <div key={i} className={`fade-in stagger-${i + 1} flex flex-col gap-3`} style={card}>
            <div className="flex justify-between items-start">
              <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center" style={{ background: c.iconBg }}>
                <i className={`${c.icon} text-[18px]`} style={{ color: c.iconColor }}></i>
              </div>
              <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: c.pos ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)', color: c.pos ? '#16a34a' : '#dc2626' }}>
                {c.badge}
              </span>
            </div>
            <div>
              <div className="text-[28px] font-bold tracking-[-1px] leading-none" style={{ color: c.vc || 'var(--color-text)' }}>
                {c.value}
              </div>
              <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-charts">
        <div className="fade-in" style={card}>
          <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>Tren Churn Bulanan</div>
          <div className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>Distribusi skor risiko — 6 bulan terakhir</div>
          <ChurnTrendChart />
        </div>
        <div className="fade-in stagger-2" style={card}>
          <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>Distribusi Risiko</div>
          <div className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>Berdasarkan kategori risiko saat ini</div>
          <RiskDonutChart counts={counts} total={total} />
        </div>
      </div>

      {/* Score System */}
      <div className="fade-in mb-6" style={card}>
        <div className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Sistem Scoring Risiko Churn</div>
        <div className="grid-score-tiers">
          {scoreTiers.map(tier => (
            <div key={tier.cls} className="rounded-xl p-4 flex flex-col gap-1.5"
              style={{ border: `1.5px solid ${tier.borderColor}`, background: tier.bg }}>
              <div className="text-[11px]" style={{ color: tier.color }}>
                <i className="fa-solid fa-circle mr-1"></i>{tier.name}
              </div>
              <div className="text-[24px] font-bold tracking-[-1px] font-mono leading-none" style={{ color: tier.color }}>{tier.range}</div>
              <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full w-fit" style={{ background: tier.color, color: '#fff' }}>
                {tier.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <div className="fade-in" style={card}>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Daftar Pelanggan</div>
          <div className="flex gap-2.5 items-center flex-wrap">
            <div className="flex items-center gap-2 rounded-[9px] px-3 py-2 w-[220px] border"
              style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)' }}>
              <i className="fa-solid fa-magnifying-glass text-[13px]" style={{ color: 'var(--color-subtle)' }}></i>
              <input type="text" placeholder="Cari pelanggan..." value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] w-full font-[inherit]"
                style={{ color: 'var(--color-text)' }} />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-[9px] px-3 py-2 font-[inherit] text-[13px] cursor-pointer outline-none border"
              style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}>
              <option value="all">Semua Kategori</option>
              <option value="high">Risiko Tinggi</option>
              <option value="med">Risiko Sedang</option>
              <option value="low">Risiko Rendah</option>
            </select>
          </div>
        </div>

        <Table customers={filtered.slice(0, 10)} />

        <div className="flex justify-between items-center mt-4 text-[12.5px]" style={{ color: 'var(--color-muted)' }}>
          <span>Menampilkan 1–{filtered.length} dari {filtered.length} pelanggan</span>
          <div className="flex gap-1.5">
            <button className="w-[30px] h-[30px] rounded-[7px] text-white text-[12.5px] font-semibold flex items-center justify-center cursor-pointer border-none"
              style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)' }}>1</button>
            <button className="px-3 h-[30px] rounded-[7px] text-[12.5px] cursor-pointer font-[inherit] border"
              style={{ background: 'var(--color-card)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
