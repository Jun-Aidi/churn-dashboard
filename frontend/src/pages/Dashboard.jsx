import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getRiskClass } from '../api/index';
import { useCustomers } from '../hooks/useCustomers';
import Table from '../components/ui/Table';
import ChurnTrendChart from '../components/charts/ChurnTrendChart';
import FeatureImportanceChart from '../components/charts/FeatureImportanceChart';

const logoSrc = '/logo_ghosting.png';

const shellCard = {
  background: 'var(--gdu-card)',
  borderRadius: 28,
  padding: '24px',
  boxShadow: 'var(--gdu-shadow)',
  border: '1px solid var(--gdu-border)',
  backdropFilter: 'blur(18px)',
};

const scoreTiers = [
  { range: '66-100', name: 'Risiko Tinggi', tag: 'Urgent', cls: 'high', borderColor: 'rgba(239,68,68,0.32)', bg: 'rgba(239,68,68,0.10)', color: 'var(--gdu-red)', icon: 'fa-fire' },
  { range: '31-65', name: 'Risiko Sedang', tag: 'Monitor', cls: 'med', borderColor: 'rgba(245,158,11,0.38)', bg: 'rgba(245,158,11,0.12)', color: '#d97706', icon: 'fa-eye' },
  { range: '0-30', name: 'Risiko Rendah', tag: 'Stabil', cls: 'low', borderColor: 'rgba(0,166,166,0.32)', bg: 'rgba(0,166,166,0.10)', color: 'var(--gdu-teal)', icon: 'fa-shield-heart' },
];

const statCards = (counts, total) => [
  { icon: 'fa-solid fa-users', iconBg: 'rgba(0,166,166,0.15)', iconColor: 'var(--gdu-teal)', label: 'Total Pelanggan', value: total, badge: '+5.2%', pos: true, gradient: 'from-[var(--gdu-teal)] to-[#0f766e]' },
  { icon: 'fa-solid fa-triangle-exclamation', iconBg: 'rgba(239,68,68,0.15)', iconColor: 'var(--gdu-red)', label: 'Risiko Tinggi', value: counts.high || 0, badge: '+12%', pos: false, vc: 'var(--gdu-red)', gradient: 'from-[var(--gdu-red)] to-[#b91c1c]' },
  { icon: 'fa-solid fa-chart-line', iconBg: 'rgba(245,158,11,0.18)', iconColor: '#d97706', label: 'Risiko Sedang', value: counts.med || 0, badge: '-3%', pos: true, vc: '#d97706', gradient: 'from-[var(--gdu-amber)] to-[#b45309]' },
  { icon: 'fa-solid fa-circle-check', iconBg: 'rgba(0,166,166,0.15)', iconColor: 'var(--gdu-teal)', label: 'Risiko Rendah', value: counts.low || 0, badge: '+8%', pos: true, vc: 'var(--gdu-teal)', gradient: 'from-[var(--gdu-teal)] to-[#115e59]' },
];

const PAGE_SIZE = 10;

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { customers, counts, total, loading } = useCustomers();

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const name = (c.name || c.id || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    const matchQ = name.includes(q) || id.includes(q);
    if (filter === 'all') return matchQ;
    const { cls } = getRiskClass(c.score);
    return matchQ && cls === filter;
  });

  // Reset to first page whenever the search query or filter changes
  React.useEffect(() => { setPage(1); }, [search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + PAGE_SIZE, filtered.length);

  const cards = statCards(counts, total);
  const highRiskRate = total ? Math.round(((counts.high || 0) / total) * 100) : 0;

  return (
    <div className="gdu-page">
      <div className="gdu-content fade-in">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-[var(--gdu-border)] gdu-hero text-[#fffaf0] shadow-[0_28px_90px_rgba(21,32,29,0.20)]">
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--gdu-teal)]/25 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[var(--gdu-amber)]/20 blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-14 w-auto object-contain sm:h-16" />
                <span className="rounded-full border border-[#fffaf0]/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#8ee7df]">
                  Ghosting Detection Unit
                </span>
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Dashboard retensi untuk membaca risiko lebih awal.
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[#fffaf0]/75 sm:text-base">
                Monitor skor churn, pola pelanggan, dan prioritas intervensi dalam warna visual yang selaras dengan landing page.
              </p>
            </div>

            <div className="relative rounded-[1.75rem] border border-[#fffaf0]/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ee7df]">High risk pulse</p>
              <div className="mt-4 flex items-end gap-4">
                <div className="text-6xl font-black tracking-[-0.06em]">{highRiskRate}%</div>
                <div className="pb-2 text-sm font-semibold text-[#fffaf0]/65">pelanggan perlu perhatian</div>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--gdu-teal)] via-[var(--gdu-amber)] to-[var(--gdu-red)]" style={{ width: `${Math.min(highRiskRate, 100)}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xl font-black">{counts.high || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#fffaf0]/50">High</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xl font-black">{counts.med || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#fffaf0]/50">Medium</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-xl font-black">{counts.low || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#fffaf0]/50">Low</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-[2rem] border border-[var(--gdu-border)] bg-[var(--gdu-card)] py-10 text-center text-sm font-bold gdu-muted shadow-lg backdrop-blur">
            <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[var(--gdu-teal)]"></i> Memuat data...
          </div>
        )}

        {!loading && total === 0 && (
          <div className="rounded-[2rem] border border-[var(--gdu-border)] bg-[var(--gdu-card)] px-6 py-16 text-center shadow-[0_24px_80px_var(--gdu-border)] backdrop-blur">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--gdu-teal)]/10 text-[var(--gdu-teal)]">
              <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
            </div>
            <h2 className="text-2xl font-black tracking-[-0.03em] gdu-title">Belum ada data pelanggan</h2>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-7 gdu-muted">
              Upload file CSV data pelanggan Anda untuk mulai menganalisis dan memprediksi risiko churn.
            </p>
            <Link
              to="/upload"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[var(--gdu-teal)] px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white no-underline shadow-[0_18px_45px_rgba(0,166,166,0.26)] transition hover:-translate-y-0.5 hover:bg-[var(--gdu-teal-dark)]"
            >
              <i className="fa-solid fa-upload text-xs"></i>
              Upload Data
            </Link>
          </div>
        )}

        {!loading && total > 0 && (
          <>
            <div className="grid-stat-cards">
              {cards.map((c, i) => (
                <div key={c.label} className={`fade-in stagger-${i + 1} group relative overflow-hidden`} style={shellCard}>
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${c.gradient}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: c.iconBg }}>
                      <i className={`${c.icon} text-xl`} style={{ color: c.iconColor }}></i>
                    </div>
                    <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ background: c.pos ? 'rgba(0,166,166,0.12)' : 'rgba(239,68,68,0.12)', color: c.pos ? 'var(--gdu-teal)' : 'var(--gdu-red)' }}>
                      {c.badge}
                    </span>
                  </div>
                  <div className="mt-5">
                    <div className="text-4xl font-black leading-none tracking-[-0.06em]" style={{ color: c.vc || 'var(--gdu-text)' }}>
                      {c.value}
                    </div>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.15em] gdu-muted">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-charts">
              <div className="fade-in" style={shellCard}>
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black tracking-[-0.03em] gdu-title">Tren Churn Bulanan</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] gdu-muted">Distribusi skor risiko - 6 bulan terakhir</div>
                  </div>
                  <span className="rounded-full bg-[var(--gdu-teal)]/10 px-3 py-1 text-xs font-black text-[var(--gdu-teal)]">Live</span>
                </div>
                <ChurnTrendChart />
              </div>
              <div className="fade-in stagger-2" style={shellCard}>
                <div className="mb-5">
                  <div className="text-lg font-black tracking-[-0.03em] gdu-title">Feature Importance</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] gdu-muted">Faktor paling berpengaruh pada model prediksi churn</div>
                </div>
                <FeatureImportanceChart />
              </div>
            </div>

            <div className="fade-in mb-6" style={shellCard}>
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--gdu-red)]">Risk scoring system</p>
                  <div className="mt-2 text-xl font-black tracking-[-0.03em] gdu-title">Sistem Scoring Risiko Churn</div>
                </div>
                <p className="max-w-xl text-sm font-medium leading-6 gdu-muted">Gunakan level risiko untuk menentukan pelanggan mana yang perlu ditindak lebih dahulu.</p>
              </div>
              <div className="grid-score-tiers">
                {scoreTiers.map((tier) => (
                  <div key={tier.cls} className="rounded-[1.5rem] p-5" style={{ border: `1.5px solid ${tier.borderColor}`, background: tier.bg }}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--gdu-input)]" style={{ color: tier.color }}>
                        <i className={`fa-solid ${tier.icon}`}></i>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ background: tier.color, color: '#fff' }}>
                        {tier.tag}
                      </span>
                    </div>
                    <div className="text-3xl font-black leading-none tracking-[-0.05em]" style={{ color: tier.color }}>{tier.range}</div>
                    <div className="mt-2 text-sm font-black gdu-title">{tier.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fade-in" style={shellCard}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--gdu-teal)]">Customer watchlist</p>
                  <div className="mt-1 text-xl font-black tracking-[-0.03em] gdu-title">Daftar Pelanggan</div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex w-full items-center gap-2 rounded-2xl border border-[var(--gdu-border)] bg-[var(--gdu-input)] px-4 py-3 sm:w-[250px]">
                    <i className="fa-solid fa-magnifying-glass text-sm text-[var(--gdu-teal)]"></i>
                    <input
                      type="text"
                      placeholder="Cari pelanggan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full border-none bg-transparent text-sm font-semibold gdu-title outline-none placeholder:gdu-subtle"
                    />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="cursor-pointer rounded-2xl border border-[var(--gdu-border)] bg-[var(--gdu-input)] px-4 py-3 text-sm font-bold gdu-title outline-none"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="high">Risiko Tinggi</option>
                    <option value="med">Risiko Sedang</option>
                    <option value="low">Risiko Rendah</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--gdu-border)] bg-[var(--gdu-input)]">
                <Table customers={pageItems} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold gdu-muted">
                <span>Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} pelanggan</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-9 rounded-xl border border-[var(--gdu-border)] bg-[var(--gdu-input)] px-4 text-sm font-bold gdu-title disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <i className="fa-solid fa-arrow-left mr-1 text-xs"></i> Prev
                  </button>
                  <span className="flex h-9 items-center rounded-xl bg-[var(--gdu-teal)] px-4 text-sm font-black text-white">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-9 rounded-xl border border-[var(--gdu-border)] bg-[var(--gdu-input)] px-4 text-sm font-bold gdu-title disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
