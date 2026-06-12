import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deactivateUserApi,
  activateUserApi,
  getStatsApi,
} from '../api/index';

// ── Validation helpers ──
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUserForm({ name, email, password, role }, isEdit = false) {
  const errors = {};
  if (!name || name.trim().length < 1) errors.name = 'Nama wajib diisi';
  else if (name.trim().length > 100) errors.name = 'Nama maksimal 100 karakter';

  if (!email || !email.trim()) errors.email = 'Email wajib diisi';
  else if (!validateEmail(email)) errors.email = 'Format email tidak valid';

  if (!isEdit) {
    if (!password) errors.password = 'Password wajib diisi';
    else if (password.length < 8) errors.password = 'Password minimal 8 karakter';
  } else if (password && password.length < 8) {
    errors.password = 'Password minimal 8 karakter';
  }

  if (!role || !['admin', 'user'].includes(role)) errors.role = 'Role harus admin atau user';

  return errors;
}

// ── Stats Card Component ──
function StatCard({ title, value, icon, color }) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: 'var(--gdu-card)',
        borderColor: 'var(--gdu-border)',
        boxShadow: 'var(--gdu-shadow)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm"
          style={{ background: color }}
        >
          <i className={icon}></i>
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--gdu-subtle)' }}>
            {title}
          </p>
          <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--gdu-text)' }}>
            {value !== null && value !== undefined ? value : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── User Form Modal ──
function UserFormModal({ isOpen, onClose, onSubmit, initialData, isEdit }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        setForm({ name: initialData.name, email: initialData.email, password: '', role: initialData.role });
      } else {
        setForm({ name: '', email: '', password: '', role: 'user' });
      }
      setErrors({});
      setApiError('');
    }
  }, [isOpen, isEdit, initialData]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateUserForm(form, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError('');
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role };
      if (form.password) payload.password = form.password;
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setApiError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-md rounded-xl p-6 border"
        style={{
          background: 'var(--gdu-card)',
          borderColor: 'var(--gdu-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--gdu-text)' }}>
          {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
        </h3>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gdu-muted)' }}>
              Nama Lengkap
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg py-2.5 px-3 text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: errors.name ? 'var(--gdu-red)' : 'var(--gdu-border)',
                color: 'var(--gdu-text)',
              }}
              placeholder="Masukkan nama lengkap"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gdu-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full rounded-lg py-2.5 px-3 text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: errors.email ? 'var(--gdu-red)' : 'var(--gdu-border)',
                color: 'var(--gdu-text)',
              }}
              placeholder="contoh@email.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gdu-muted)' }}>
              Password {isEdit && <span className="font-normal">(kosongkan jika tidak ingin mengubah)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full rounded-lg py-2.5 px-3 text-sm border outline-none"
              style={{
                background: 'var(--color-bg)',
                borderColor: errors.password ? 'var(--gdu-red)' : 'var(--gdu-border)',
                color: 'var(--gdu-text)',
              }}
              placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--gdu-muted)' }}>
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full rounded-lg py-2.5 px-3 text-sm border outline-none cursor-pointer"
              style={{
                background: 'var(--color-bg)',
                borderColor: errors.role ? 'var(--gdu-red)' : 'var(--gdu-border)',
                color: 'var(--gdu-text)',
              }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--gdu-border)',
                color: 'var(--gdu-muted)',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--gdu-teal)' }}
            >
              {submitting ? (
                <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Menyimpan...</>
              ) : (
                isEdit ? 'Simpan Perubahan' : 'Buat Pengguna'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Main Admin Page ──
export default function Admin() {
  const { user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorUsers, setErrorUsers] = useState('');
  const [errorStats, setErrorStats] = useState('');
  const [toast, setToast] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Toast helper
  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers('');
    try {
      const data = await getUsersApi();
      setUsers(data.users || []);
    } catch (err) {
      setErrorUsers(err.message || 'Gagal memuat daftar pengguna');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorStats('');
    try {
      const data = await getStatsApi();
      setStats(data);
    } catch (err) {
      setErrorStats(err.message || 'Data sistem tidak tersedia');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers, loadStats]);

  // Create user handler
  const handleCreateUser = async (payload) => {
    await createUserApi(payload);
    showToast('Pengguna berhasil dibuat', 'success');
    loadUsers();
    loadStats();
  };

  // Edit user handler
  const handleEditUser = async (payload) => {
    await updateUserApi(editingUser.id, payload);
    showToast('Pengguna berhasil diperbarui', 'success');
    loadUsers();
  };

  // Deactivate user handler
  const handleDeactivate = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      showToast('Admin tidak dapat menonaktifkan akun sendiri', 'error');
      return;
    }
    try {
      await deactivateUserApi(targetUser.id);
      showToast(`Pengguna ${targetUser.name} berhasil dinonaktifkan`, 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Gagal menonaktifkan pengguna', 'error');
    }
  };

  // Activate user handler
  const handleActivate = async (targetUser) => {
    try {
      await activateUserApi(targetUser.id);
      showToast(`Pengguna ${targetUser.name} berhasil diaktifkan`, 'success');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast(err.message || 'Gagal mengaktifkan pengguna', 'error');
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="gdu-page">
      <div className="gdu-content fade-in">
        {/* Toast Notification */}
        {toast && (
          <div
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-in"
            style={{
              background: toast.type === 'success' ? 'var(--gdu-teal)' : 'var(--gdu-red)',
              color: '#fff',
            }}
          >
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
            {toast.message}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6 rounded-[2rem] p-6 gdu-hero">
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Admin Panel</h1>
          <p className="mt-2 text-sm font-medium text-[#fffaf0]/70">Kelola pengguna dan pantau statistik sistem</p>
        </div>

        {/* ═══ System Statistics Section ═══ */}
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--gdu-text)' }}>
            <i className="fa-solid fa-chart-pie mr-2 text-sm" style={{ color: 'var(--gdu-subtle)' }}></i>
            Statistik Sistem
          </h2>

          {loadingStats ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--gdu-subtle)' }}>
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat statistik...
            </div>
          ) : errorStats ? (
            <div className="text-center py-8 text-sm text-red-600">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> {errorStats}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Pengguna Aktif"
                value={stats?.active_users}
                icon="fa-solid fa-user-check"
                color="var(--gdu-teal)"
              />
              <StatCard
                title="Pengguna Nonaktif"
                value={stats?.inactive_users}
                icon="fa-solid fa-user-xmark"
                color="var(--gdu-red)"
              />
              <StatCard
                title="Total Pelanggan"
                value={stats?.total_customers}
                icon="fa-solid fa-users"
                color="var(--gdu-teal)"
              />
              <StatCard
                title="Pelanggan Terskor"
                value={stats?.total_scored_customers}
                icon="fa-solid fa-brain"
                color="var(--gdu-amber)"
              />
              <StatCard
                title="Total Sesi Chat"
                value={stats?.total_chat_sessions}
                icon="fa-solid fa-comments"
                color="var(--gdu-amber)"
              />
            </div>
          )}
        </section>

        {/* ═══ User Management Section ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--gdu-text)' }}>
              <i className="fa-solid fa-users-gear mr-2 text-sm" style={{ color: 'var(--gdu-subtle)' }}></i>
              Manajemen Pengguna
            </h2>
            <button
              onClick={() => { setEditingUser(null); setShowModal(true); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer flex items-center gap-2"
              style={{ background: 'var(--gdu-teal)' }}
            >
              <i className="fa-solid fa-plus text-xs"></i> Tambah Pengguna
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--gdu-subtle)' }}>
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat daftar pengguna...
            </div>
          ) : errorUsers ? (
            <div className="text-center py-8 text-sm text-red-600">
              <i className="fa-solid fa-triangle-exclamation mr-2"></i> {errorUsers}
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: 'var(--gdu-card)',
                borderColor: 'var(--gdu-border)',
                boxShadow: 'var(--gdu-shadow)',
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b"
                      style={{ borderColor: 'var(--gdu-border)', background: 'var(--gdu-hover)' }}
                    >
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Nama</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Email</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Role</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Status</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Tanggal Registrasi</th>
                      <th className="text-center px-4 py-3 font-medium" style={{ color: 'var(--gdu-muted)' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b last:border-b-0 transition-colors"
                        style={{ borderColor: 'var(--gdu-border)' }}
                      >
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--gdu-text)' }}>
                          {u.name}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--gdu-muted)' }}>
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: u.role === 'admin' ? 'rgba(79,142,247,0.15)' : 'rgba(107,114,128,0.15)',
                              color: u.role === 'admin' ? 'var(--gdu-teal)' : '#6b7280',
                            }}
                          >
                            {u.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: u.is_active ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
                              color: u.is_active ? 'var(--gdu-teal)' : 'var(--gdu-red)',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: u.is_active ? 'var(--gdu-teal)' : 'var(--gdu-red)' }}
                            ></span>
                            {u.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--gdu-subtle)' }}>
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit button */}
                            <button
                              onClick={() => { setEditingUser(u); setShowModal(true); }}
                              className="p-1.5 rounded-md text-xs cursor-pointer border-none transition-colors"
                              style={{ background: 'var(--gdu-hover)', color: 'var(--gdu-muted)' }}
                              title="Edit pengguna"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            {/* Activate/Deactivate toggle */}
                            {u.is_active ? (
                              <button
                                onClick={() => handleDeactivate(u)}
                                className="p-1.5 rounded-md text-xs cursor-pointer border-none transition-colors"
                                style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--gdu-red)' }}
                                title="Nonaktifkan pengguna"
                              >
                                <i className="fa-solid fa-user-slash"></i>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(u)}
                                className="p-1.5 rounded-md text-xs cursor-pointer border-none transition-colors"
                                style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--gdu-teal)' }}
                                title="Aktifkan pengguna"
                              >
                                <i className="fa-solid fa-user-check"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--gdu-subtle)' }}>
                          Belum ada pengguna terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* User Form Modal */}
        <UserFormModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSubmit={editingUser ? handleEditUser : handleCreateUser}
          initialData={editingUser}
          isEdit={Boolean(editingUser)}
        />
      </div>
    </div>
  );
}
