// ══════════════════════════════════════════
// Client-side export helpers (no external libs)
// ══════════════════════════════════════════
import { getRiskClass, getFactors, getRecos } from '../api/index';

// ── Escape a single CSV cell (RFC 4180) ──
function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Export a list of (already filtered) customers to a CSV file.
 * Columns: customer_id, plan, contract, risk_score, risk_class, and key metrics.
 */
export function exportCustomersCsv(customers, filename) {
  const headers = [
    'customer_id',
    'plan',
    'contract',
    'risk_score',
    'risk_class',
    'tenure_months',
    'monthly_usage_hrs',
    'feature_adoption_pct',
    'days_since_login',
    'ticket_count',
    'nps_latest',
    'late_payment_count',
    'status',
  ];

  const rows = customers.map((c) => {
    const { cls } = getRiskClass(c.score);
    return [
      c.id,
      c.plan,
      c.contract,
      c.score,
      cls,
      c.tenure,
      c.usage,
      c.adoption,
      c.lastLogin,
      c.tickets,
      c.nps,
      c.delay,
      c.churned ? 'churned' : 'active',
    ].map(csvCell).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  // Prepend BOM so Excel reads UTF-8 correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename || `pelanggan_${timestamp()}.csv`);
}

/**
 * Export a single customer report as a PDF.
 * Uses the browser print engine (window.print on a generated document) so no
 * external dependency is required. Includes profile, risk score, churn factors
 * and recommendations.
 */
export function exportCustomerReport(customer) {
  const risk = getRiskClass(customer.score);
  const factors = getFactors(customer);
  const recos = getRecos(customer);

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const generatedAt = new Date().toLocaleString('id-ID');

  const infoRows = [
    ['Customer ID', customer.id],
    ['Plan', customer.plan],
    ['Kontrak', customer.contract],
    ['Tenure', `${customer.tenure} bulan`],
    ['Penggunaan', `${customer.usage} jam/bln`],
    ['Adopsi Fitur', `${customer.adoption}%`],
    ['Tiket Support', `${customer.tickets} tiket`],
    ['Last Login', `${customer.lastLogin} hari lalu`],
    ['NPS Score', `${customer.nps}/10`],
    ['Status', customer.churned ? 'Churned' : 'Aktif'],
  ];

  const factorsHtml = factors
    .map(
      (f) => `
      <div class="factor">
        <div class="factor-head">
          <span class="factor-name">${esc(f.name)}</span>
          <span class="factor-impact">Impact: ${esc(f.impact)}%</span>
        </div>
        <div class="factor-detail">${esc(f.detail)}</div>
      </div>`
    )
    .join('');

  const recosHtml = recos
    .map(
      (r) => `
      <div class="reco">
        <div class="reco-title">${esc(r.title)}</div>
        <div class="reco-desc">${esc(r.desc)}</div>
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Laporan Risiko Churn - ${esc(customer.id)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
  .score-box { border: 1px solid #ddd; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; }
  .score-num { font-size: 40px; font-weight: 700; color: ${risk.color}; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #fff; background: ${risk.color}; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  td:first-child { color: #666; width: 45%; text-transform: uppercase; font-size: 11px; letter-spacing: .4px; }
  td:last-child { font-weight: 600; }
  h2 { font-size: 15px; margin: 0 0 10px; border-left: 4px solid ${risk.color}; padding-left: 10px; }
  .factor, .reco { border: 1px solid #eee; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
  .factor-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .factor-name { font-weight: 600; font-size: 13px; }
  .factor-impact { font-size: 11px; color: #b91c1c; font-weight: 600; }
  .factor-detail, .reco-desc { font-size: 12px; color: #555; line-height: 1.5; }
  .reco-title { font-weight: 600; font-size: 13px; margin-bottom: 3px; }
  .footer { margin-top: 28px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Laporan Risiko Churn</h1>
  <div class="subtitle">Pelanggan: ${esc(customer.id)} &middot; Dibuat: ${esc(generatedAt)}</div>

  <div class="score-box">
    <div>
      <div style="font-size:12px;color:#666;margin-bottom:4px;">Skor Risiko Churn</div>
      <span class="badge">${esc(risk.label)}</span>
    </div>
    <div class="score-num">${esc(customer.score)}</div>
  </div>

  <h2>Profil Pelanggan</h2>
  <table>
    ${infoRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
  </table>

  <h2>Faktor Penyebab Churn</h2>
  ${factorsHtml}

  <h2>Rekomendasi Aksi</h2>
  ${recosHtml}

  <div class="footer">Ghosting Detection Unit &middot; Laporan ini dibuat otomatis dari dashboard retensi.</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup diblokir. Izinkan popup untuk mengekspor laporan.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content to render, then open the print dialog (user can "Save as PDF")
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
