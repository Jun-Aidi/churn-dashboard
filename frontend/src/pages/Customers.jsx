import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getRiskClass, createCustomer } from '../api/index';
import { useCustomers } from '../hooks/useCustomers';
import { exportCustomersCsv } from '../utils/export';
import Badge from '../components/ui/Badge';

// Feature fields for manual customer entry (matches backend Customer columns)
const ADD_FIELDS = [
  { key: 'customer_id',          label: 'Customer ID',                  type: 'text',   placeholder: 'C-0001' },
  { key: 'plan_type',            label: 'Plan Type',                    type: 'select', options: ['starter', 'professional', 'enterprise'] },
  { key: 'contract_type',        label: 'Contract Type',                type: 'select', options: ['monthly', 'annual'] },
  { key: 'tenure_days',          label: 'Tenure (hari)',                type: 'number', placeholder: '365' },
  { key: 'monthly_usage_hrs',    label: 'Penggunaan (jam/bulan)',       type: 'number', placeholder: '30' },
  { key: 'feature_adoption_pct', label: 'Adopsi Fitur (%)',             type: 'number', placeholder: '60' },
  { key: 'days_since_login',     label: 'Hari Sejak Login Terakhir',    type: 'number', placeholder: '15' },
  { key: 'total_users',          label: 'Jumlah Pengguna',              type: 'number', placeholder: '5' },
  { key: 'nps_latest',           label: 'NPS Score (0-10)',             type: 'number', placeholder: '7' },
  { key: 'ticket_count',         label: 'Total Tiket Support',          type: 'number', placeholder: '3' },
  { key: 'critical_tickets',     label: 'Tiket Kritikal',               type: 'number', placeholder: '1' },
  { key: 'open_tickets',         label: 'Tiket Terbuka',                type: 'number', placeholder: '1' },
  { key: 'total_billed',         label: 'Total Tagihan ($)',            type: 'number', placeholder: '5000' },
  { key: 'avg_payment_value',    label: 'Rata-rata Nilai Bayar ($)',    type: 'number', placeholder: '400' },
  { key: 'late_payment_count',   label: 'Jumlah Telat Bayar',           type: 'number', placeholder: '1' },
  { key: 'dunning_count',        label: 'Jumlah Dunning',               type: 'number', placeholder: '0' },
  { key: 'avg_days_late',        label: 'Rata-rata Hari Telat',         type: 'number', placeholder: '2' },
  { key: 'payment_count',        label: 'Jumlah Pembayaran',            type: 'number', placeholder: '12' },
];

function AddCustomerModal({ onClose, onSaved }) {
  const initial = ADD_FIELDS.reduce((acc, f) => {
    acc[f.key] = f.type === 'select' ? f.options[0] : '';
    return acc;
  }, {});
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError(null);
    if (!String(form.customer_id || '').trim()) {
      setError('Customer ID wajib diisi.');
      return;
    }
    // Build payload: numbers parsed, text/select kept as-is
    const payload = {};
    for (const f of ADD_FIELDS) {
      const raw = form[f.key];
      if (f.type === 'number') {
        payload[f.key] = raw === '' || raw === null ? 0 : parseFloat(raw);
      } else {
        payload[f.key] = raw;
      }
    }

    try {
      setSaving(true);
      await createCustomer(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--gdu-card)', borderRadius: 14,
          border: '1px solid var(--gdu-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          width: '100%', maxWidth: 640,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '24px 26px 14px' }}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--gdu-text)' }}>Tambah Pelanggan</h2>
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--gdu-muted)' }}>
            Masukkan nilai semua fitur. Skor risiko churn dihitung otomatis. Data ini hanya muncul di dashboard akun Anda.
          </p>
        </div>

        <div style={{ padding: '0 26px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {ADD_FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gdu-subtle)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {f.label}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key]}
                    onChange={e => handleChange(f.key, e.target.value)}
                    style={{ width: '100%', background: 'var(--gdu-input)', border: '1px solid var(--gdu-border)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: 'var(--gdu-text)', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {f.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => handleChange(f.key, e.target.value)}
                    min={f.type === 'number' ? '0' : undefined}
                    step={f.type === 'number' ? 'any' : undefined}
                    style={{ width: '100%', background: 'var(--gdu-input)', border: '1px solid var(--gdu-border)', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: 'var(--gdu-text)', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginTop: 14, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 9, padding: '10px 14px', fontSize: 12.5, color: 'var(--gdu-red)' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 justify-end" style={{ padding: '14px 26px 22px', borderTop: '1px solid var(--gdu-border)', marginTop: 6 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Batal</button>
          <button className="btn btn-accent" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</> : <><i className="fa-solid fa-plus text-xs"></i> Simpan Pelanggan</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const { customers, counts, total, loading, error, refresh } = useCustomers();

  const PAGE_SIZE = 12;

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const name = (c.name || c.id || '').toLowerCase();
    const id = (c.id || '').toLowerCase();
    const matchQ = name.includes(q) || id.includes(q);
    const { cls } = getRiskClass(c.score);
    if (activeFilter === 'all')  return matchQ;
    if (activeFilter === 'high') return matchQ && cls === 'high';
    if (activeFilter === 'med')  return matchQ && cls === 'med';
    if (activeFilter === 'low')  return matchQ && cls === 'low';
    return matchQ;
  });

  // Reset to first page whenever the search query or filter changes
  React.useEffect(() => { setPage(1); }, [search, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + PAGE_SIZE, filtered.length);

  // Export the currently filtered list (respects search + active tab)
  const handleExport = () => {
    if (filtered.length === 0) return;
    const suffix = activeFilter === 'all' ? 'semua' : activeFilter;
    exportCustomersCsv(filtered, `pelanggan_${suffix}.csv`);
  };

  const tabs = [
    { key: 'all',  label: `Semua (${total})` },
    { key: 'high', label: `Risiko Tinggi (${counts.high || 0})` },
    { key: 'med',  label: `Sedang (${counts.med || 0})` },
    { key: 'low',  label: `Rendah (${counts.low || 0})` },
  ];

  return (
    <div className="gdu-page">
      <div className="gdu-content fade-in">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[2rem] p-6 gdu-hero sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8ee7df]">Customer watchlist</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Pelanggan</h1>
            <p className="mt-2 text-sm font-medium text-[#fffaf0]/70">Semua pelanggan beserta skor risiko churn</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              className="rounded-2xl border border-[#fffaf0]/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-[#fffaf0] transition hover:bg-[#fffaf0]/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleExport}
              disabled={loading || filtered.length === 0}
            ><i className="fa-solid fa-download text-xs"></i> Export CSV</button>
            <button className="rounded-2xl gdu-secondary px-4 py-2.5 text-sm font-black" onClick={() => setShowAdd(true)}><i className="fa-solid fa-plus text-xs"></i> Tambah Pelanggan</button>
          </div>
        </div>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] pointer-events-none" style={{ color: 'var(--gdu-subtle)' }}></i>
          <input type="text" placeholder="Cari nama atau customer ID..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[9px] py-2.5 pl-9 pr-4 font-[inherit] text-[13px] outline-none border"
            style={{ background: 'var(--gdu-card)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }} />
        </div>
        <div className="flex overflow-hidden rounded-[9px] border" style={{ background: 'var(--gdu-card)', borderColor: 'var(--gdu-border)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className="px-4 py-2.5 text-[12.5px] border-none cursor-pointer font-[inherit] whitespace-nowrap transition-all duration-150"
              style={{
                fontWeight: activeFilter === tab.key ? 600 : 500,
                background: activeFilter === tab.key ? 'var(--gdu-teal)' : 'transparent',
                color: activeFilter === tab.key ? '#fff' : 'var(--gdu-muted)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--gdu-subtle)' }}>
          <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data pelanggan...
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-red-600">
          <i className="fa-solid fa-triangle-exclamation mr-2"></i> Gagal memuat data: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--gdu-subtle)' }}>Tidak ada pelanggan yang ditemukan.</div>
      ) : (
        <>
        <div className="grid-customers">
          {pageItems.map(c => {
            const risk = getRiskClass(c.score);
            const bc = risk.cls === 'high' ? 'var(--gdu-red)' : risk.cls === 'med' ? 'var(--gdu-amber)' : 'var(--gdu-teal)';
            return (
              <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                className="rounded-[14px] px-5 py-[18px] cursor-pointer transition-all duration-[180ms] hover:-translate-y-0.5"
                style={{
                  background: 'var(--gdu-card)',
                  boxShadow: 'var(--gdu-shadow)',
                  border: '1px solid var(--gdu-border)',
                  borderLeft: `3px solid ${bc}`,
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--gdu-shadow)'}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--gdu-text)' }}>{c.name}</div>
                    <div className="text-[11.5px] font-mono mt-0.5" style={{ color: 'var(--gdu-subtle)' }}>{c.id}</div>
                  </div>
                  <div className="text-[28px] font-bold font-mono leading-none" style={{ color: risk.color }}>{c.score}</div>
                </div>
                <div className="mb-2">
                  <div className="h-[5px] rounded overflow-hidden" style={{ background: 'var(--gdu-hover)' }}>
                    <div className="h-full rounded" style={{ width: `${c.score}%`, background: bc }} />
                  </div>
                </div>
                <div className="mb-2"><Badge riskObj={risk} /></div>
                <div className="flex gap-2.5 flex-wrap text-xs mt-2" style={{ color: 'var(--gdu-subtle)' }}>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-box text-[10px]"></i> {c.plan}</span>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-clock text-[10px]"></i> {c.tenure} bln</span>
                  <span className="flex items-center gap-1"><i className="fa-solid fa-ticket text-[10px]"></i> {c.tickets} tiket</span>
                </div>
                <div className="mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: c.churned ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)', color: c.churned ? 'var(--gdu-red)' : 'var(--gdu-teal)' }}>
                    {c.churned ? '✕ Churned' : '✓ Aktif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold" style={{ color: 'var(--gdu-muted)' }}>
          <span>Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} pelanggan</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-9 rounded-xl border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--gdu-card)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
            >
              <i className="fa-solid fa-arrow-left mr-1 text-xs"></i> Prev
            </button>
            <span className="flex h-9 items-center rounded-xl px-4 text-sm font-black text-white" style={{ background: 'var(--gdu-teal)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-9 rounded-xl border px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'var(--gdu-card)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
            >
              Next <i className="fa-solid fa-arrow-right ml-1 text-xs"></i>
            </button>
          </div>
        </div>
        </>
      )}
      </div>
    </div>
  );
}
