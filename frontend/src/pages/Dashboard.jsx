import React, { useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { customers, getRiskClass } from '../api/index';
import StatCard from '../components/ui/StatCard';
import Table from '../components/ui/Table';
import ChurnTrendChart from '../components/charts/ChurnTrendChart';
import RiskDonutChart from '../components/charts/RiskDonutChart';
import Navbar from '../components/layout/Navbar';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  border: '1px solid #e8e4da',
};

const scoreTiers = [
  {
    range: '66–100',
    name: 'Risiko Tinggi',
    tag: 'Urgent',
    cls: 'high',
    borderColor: '#e03d3d',
    bg: '#fdf0f0',
    color: '#e03d3d',
    tagBg: '#e03d3d',
    tagColor: '#fff',
  },
  {
    range: '31–65',
    name: 'Risiko Sedang',
    tag: 'Monitor',
    cls: 'med',
    borderColor: '#d4a017',
    bg: '#fdf9ee',
    color: '#d4a017',
    tagBg: '#d4a017',
    tagColor: '#1a1710',
  },
  {
    range: '0–30',
    name: 'Risiko Rendah',
    tag: 'Stabil',
    cls: 'low',
    borderColor: '#2da44e',
    bg: '#edfaf2',
    color: '#2da44e',
    tagBg: '#2da44e',
    tagColor: '#fff',
  },
];

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const counts = customers.reduce((acc, c) => {
    const { cls } = getRiskClass(c.score);
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    if (filter === 'all') return matchQ;
    const { cls } = getRiskClass(c.score);
    return matchQ && cls === filter;
  });

  return (
    <div className="fade-in">
      <Navbar
        title="Dashboard"
        subtitle="Monitor dan prediksi risiko churn pelanggan"
        actions={
          <>
            <button className="btn btn-ghost">
              <Download size={14} /> Export
            </button>
            <button className="btn btn-accent">
              <Plus size={14} /> Tambah Pelanggan
            </button>
          </>
        }
      />

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          variant="total"
          icon="👥"
          badgeText="+5.2%"
          badgeColor="green"
          label="Total Pelanggan"
          value={customers.length}
          animClass="stagger-1"
        />
        <StatCard
          variant="high"
          icon="⚠️"
          badgeText="+12%"
          badgeColor="red"
          label="Risiko Tinggi (66–100)"
          value={counts.high || 0}
          valueColor="#e03d3d"
          animClass="stagger-2"
        />
        <StatCard
          variant="med"
          icon="🔶"
          badgeText="-3%"
          badgeColor="yellow"
          label="Risiko Sedang (31–65)"
          value={counts.med || 0}
          valueColor="#d4a017"
          animClass="stagger-3"
        />
        <StatCard
          variant="low"
          icon="✅"
          badgeText="+8%"
          badgeColor="green"
          label="Risiko Rendah (0–30)"
          value={counts.low || 0}
          valueColor="#2da44e"
          animClass="stagger-4"
        />
      </div>

      {/* Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="fade-in" style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Tren Churn Bulanan</div>
          <div style={{ fontSize: 12, color: '#8a8270', marginBottom: 18 }}>Distribusi skor risiko — 6 bulan terakhir</div>
          <ChurnTrendChart />
        </div>
        <div className="fade-in stagger-2" style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Distribusi Risiko Churn</div>
          <div style={{ fontSize: 12, color: '#8a8270', marginBottom: 18 }}>Berdasarkan kategori risiko saat ini</div>
          <RiskDonutChart />
        </div>
      </div>

      {/* Score System */}
      <div className="fade-in" style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Sistem Scoring Risiko Churn</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {scoreTiers.map(tier => (
            <div
              key={tier.cls}
              style={{
                borderRadius: 10,
                padding: '14px 16px',
                border: `1.5px solid ${tier.borderColor}`,
                background: tier.bg,
              }}
            >
              <div style={{
                fontSize: 22, fontWeight: 700,
                letterSpacing: '-1px',
                fontFamily: 'DM Mono, monospace',
                color: tier.color,
              }}>
                {tier.range}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, marginBottom: 6, color: tier.color }}>
                {tier.name}
              </div>
              <span style={{
                display: 'inline-block', fontSize: 10.5, fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
                background: tier.tagBg, color: tier.tagColor,
              }}>
                {tier.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="fade-in" style={cardStyle}>
        <div className="flex justify-between items-center mb-4">
          <div style={{ fontSize: 14, fontWeight: 600 }}>Daftar Pelanggan</div>
          <div className="flex gap-2.5 items-center">
            {/* Search */}
            <div
              className="flex items-center gap-2"
              style={{
                background: '#f5f3ee',
                border: '1px solid #e8e4da',
                borderRadius: 9, padding: '8px 14px',
                fontSize: 13, color: '#8a8270', width: 220,
              }}
            >
              <Search size={13} />
              <input
                type="text"
                placeholder="Cari pelanggan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, color: '#1a1710', width: '100%',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>
            {/* Filter */}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: '#f5f3ee',
                border: '1px solid #e8e4da',
                borderRadius: 9, padding: '8px 14px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13, color: '#1a1710', cursor: 'pointer',
              }}
            >
              <option value="all">Semua Kategori</option>
              <option value="high">Risiko Tinggi</option>
              <option value="med">Risiko Sedang</option>
              <option value="low">Risiko Rendah</option>
            </select>
          </div>
        </div>

        <Table customers={filtered} />

        <div className="flex justify-between items-center mt-4" style={{ fontSize: 12.5, color: '#8a8270' }}>
          <span>Menampilkan 1–{filtered.length} dari {filtered.length} pelanggan</span>
          <div className="flex gap-1.5">
            <button
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: '1px solid #e8e4da', background: '#c9a84c',
                color: '#1a1710', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >1</button>
            <button
              style={{
                padding: '0 10px', height: 30, borderRadius: 7,
                border: '1px solid #e8e4da', background: '#fff',
                fontSize: 12.5, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
