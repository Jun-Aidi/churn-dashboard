import { useState } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const logoSrc = '/logo_ghosting.png';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  function validate() {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!password) {
      newErrors.password = 'Password wajib diisi';
    } else if (password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(email, password);
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-[#f5efe4]">
        <div className="rounded-full border border-[#15201d]/10 bg-[#fffaf0]/80 px-5 py-3 text-sm font-bold text-[#60716c] shadow-lg backdrop-blur">
          <i className="fa-solid fa-circle-notch fa-spin mr-2 text-[#00a6a6]"></i>
          Memuat...
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full min-h-screen overflow-hidden bg-[#f5efe4] text-[#15201d]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(0,166,166,0.28),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(245,158,11,0.26),transparent_26%),radial-gradient(circle_at_55%_100%,rgba(239,68,68,0.16),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(21,32,29,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(21,32,29,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between p-8 lg:flex xl:p-12">
          <Link to="/" className="flex w-fit items-center gap-3 rounded-full border border-[#15201d]/10 bg-[#fffaf0]/70 px-4 py-3 shadow-sm backdrop-blur transition hover:bg-white">
            <span className="flex h-14 w-28 items-center justify-center rounded-full px-0">
              <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-10 w-auto object-contain" />
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.14em]">Ghosting Detection Unit</span>
              <span className="block text-xs font-semibold text-[#60716c]">Retention Intelligence</span>
            </span>
          </Link>

          <div className="max-w-2xl fade-in">
            <div className="mb-6 inline-flex rounded-full bg-[#15201d] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#fffaf0]">
              Secure analytics access
            </div>
            <h1 className="text-6xl font-black leading-[0.95] tracking-[-0.055em] xl:text-7xl">
              Masuk ke pusat komando retensi.
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-[#4f625d]">
              Akses skor churn, insight pelanggan, dan rekomendasi tindakan dalam satu dashboard yang fokus pada keputusan cepat.
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-3 gap-3">
            {[
              ['Prediksi', 'ML model'],
              ['Segmentasi', 'Risk tier'],
              ['Copilot', 'Insight AI'],
            ].map(([title, label]) => (
              <div key={title} className="rounded-3xl border border-[#15201d]/10 bg-[#fffaf0]/70 p-5 backdrop-blur">
                <p className="text-lg font-black">{title}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#60716c]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md fade-in stagger-1">
            <div className="mb-6 flex justify-center lg:hidden">
              <Link to="/" className="flex items-center gap-3">
                <span className="flex h-14 w-28 items-center justify-center rounded-full px-0 shadow-lg">
                  <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-10 w-auto object-contain" />
                </span>
                <span className="font-black uppercase tracking-[0.16em]">GDU</span>
              </Link>
            </div>

            <div className="relative rounded-[2rem] border border-[#15201d]/10 bg-[#fffaf0]/85 p-6 shadow-[0_35px_100px_rgba(21,32,29,0.16)] backdrop-blur-xl sm:p-8">
              <div className="absolute -right-5 -top-5 hidden h-24 w-24 rounded-full bg-[#00a6a6]/20 blur-2xl sm:block" />
              <div className="relative">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-24 w-52 items-center justify-center rounded-3xl px-0">
                    <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-16 w-auto object-contain" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00a6a6]">Welcome back</p>
                  <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#15201d]">Masuk ke Dashboard</h1>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#60716c]">
                    Gunakan kredensial admin untuk membuka Ghosting Detection Unit.
                  </p>
                </div>

                {serverError && (
                  <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#4f625d]">
                      Email
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#00a6a6]"></i>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="nama@perusahaan.com"
                        className={`w-full rounded-2xl border bg-white/80 px-4 py-4 pl-11 text-sm font-semibold text-[#15201d] outline-none transition placeholder:text-[#9aa7a3]
                          ${errors.email
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-[#15201d]/10 focus:border-[#00a6a6] focus:ring-4 focus:ring-[#00a6a6]/10'
                          }`}
                        disabled={submitting}
                      />
                    </div>
                    {errors.email && <p className="mt-2 text-xs font-semibold text-red-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#4f625d]">
                      Password
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#00a6a6]"></i>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                        }}
                        placeholder="Minimal 8 karakter"
                        className={`w-full rounded-2xl border bg-white/80 px-4 py-4 pl-11 text-sm font-semibold text-[#15201d] outline-none transition placeholder:text-[#9aa7a3]
                          ${errors.password
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-[#15201d]/10 focus:border-[#00a6a6] focus:ring-4 focus:ring-[#00a6a6]/10'
                          }`}
                        disabled={submitting}
                      />
                    </div>
                    {errors.password && <p className="mt-2 text-xs font-semibold text-red-600">{errors.password}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#15201d] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#fffaf0] shadow-[0_18px_45px_rgba(21,32,29,0.25)] transition hover:-translate-y-0.5 hover:bg-[#00a6a6] focus:outline-none focus:ring-4 focus:ring-[#00a6a6]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk
                        <i className="fa-solid fa-arrow-right text-xs transition group-hover:translate-x-1"></i>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#60716c] transition hover:text-[#00a6a6]">
                <i className="fa-solid fa-arrow-left text-xs"></i>
                Kembali ke halaman utama
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
