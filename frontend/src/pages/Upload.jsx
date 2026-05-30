import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Upload gagal');
      }
    } catch (err) {
      setError('Tidak bisa terhubung ke server');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Data</h1>
          <p className="page-subtitle">Upload file CSV pelanggan untuk prediksi churn</p>
        </div>
      </div>

      <div className="rounded-[14px] p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--color-card-shadow)' }}>
        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          {/* Info */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
            <div className="text-sm font-semibold mb-2" style={{ color: '#4f8ef7' }}>
              <i className="fa-solid fa-info-circle mr-2"></i>Format CSV yang Didukung
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              <p className="mb-1"><strong>CSV Merged</strong> — File yang sudah berisi semua fitur (customer_id, plan_type, tenure_days, ticket_count, nps_latest, total_billed, dll)</p>
              <p>File harus mengandung kolom <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--color-hover)' }}>customer_id</code> sebagai identifier unik.</p>
            </div>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Pilih File CSV</label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={e => { setFile(e.target.files[0]); setResult(null); setError(null); }}
                className="w-full rounded-[9px] py-3 px-4 text-sm font-[inherit] outline-none border cursor-pointer"
                style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}
              />
            </div>
            {file && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
                <i className="fa-solid fa-file-csv mr-1"></i> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || uploading}
            className="btn btn-accent w-fit px-6 py-2.5 text-sm font-semibold"
            style={{ opacity: (!file || uploading) ? 0.5 : 1 }}
          >
            {uploading ? (
              <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memproses...</>
            ) : (
              <><i className="fa-solid fa-upload mr-2"></i> Upload & Prediksi</>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: '#16a34a' }}>
              <i className="fa-solid fa-check-circle mr-2"></i>Upload Berhasil
            </div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{result.message}</p>
            {result.inserted !== undefined && (
              <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--color-text)' }}>
                <span><strong>{result.total_rows}</strong> total baris</span>
                <span><strong>{result.inserted}</strong> baru</span>
                <span><strong>{result.updated}</strong> diperbarui</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="text-sm font-semibold" style={{ color: '#dc2626' }}>
              <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
