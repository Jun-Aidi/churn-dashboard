import React, { useState } from 'react';
import { fetchWithAuth } from '../api/index';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api';

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
      const res = await fetchWithAuth(`${API_BASE}/upload`, {
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
    <div className="gdu-page">
      <div className="gdu-content fade-in">
        <div className="mb-6 rounded-[2rem] p-6 gdu-hero">

          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Upload Data</h1>
          <p className="mt-2 text-sm font-medium text-[#fffaf0]/70">Upload file CSV pelanggan untuk prediksi churn</p>
        </div>

        <div className="gdu-card p-6">
          <form onSubmit={handleUpload} className="flex flex-col gap-5">
            {/* Info */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--gdu-teal)' }}>
                <i className="fa-solid fa-info-circle mr-2"></i>Format CSV yang Didukung
              </div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--gdu-muted)' }}>
                <p className="mb-1"><strong>CSV Merged</strong> — File yang sudah berisi semua fitur (customer_id, plan_type, tenure_days, ticket_count, nps_latest, total_billed, dll)</p>
                <p>File harus mengandung kolom <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: 'var(--gdu-hover)' }}>customer_id</code> sebagai identifier unik.</p>
              </div>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gdu-text)' }}>Pilih File CSV</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => { setFile(e.target.files[0]); setResult(null); setError(null); }}
                  className="w-full rounded-[9px] py-3 px-4 text-sm font-[inherit] outline-none border cursor-pointer"
                  style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
                />
              </div>
              {file && (
                <p className="text-xs mt-2" style={{ color: 'var(--gdu-muted)' }}>
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
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--gdu-teal)' }}>
                <i className="fa-solid fa-check-circle mr-2"></i>Upload Berhasil
              </div>
              <p className="text-xs" style={{ color: 'var(--gdu-muted)' }}>{result.message}</p>
              {result.inserted !== undefined && (
                <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--gdu-text)' }}>
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
              <div className="text-sm font-semibold" style={{ color: 'var(--gdu-red)' }}>
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>{error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
