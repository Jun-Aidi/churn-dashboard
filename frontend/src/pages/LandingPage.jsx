import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const logoSrc = '/logo_ghosting.png';

const features = [
  {
    icon: 'fa-solid fa-radar',
    accent: '#00a6a6',
    title: 'Radar Churn Real-time',
    description:
      'Pantau pelanggan berisiko dengan sinyal perilaku, skor churn, dan prioritas retensi yang mudah dipahami tim.',
  },
  {
    icon: 'fa-solid fa-layer-group',
    accent: '#f59e0b',
    title: 'Segmentasi Cerdas',
    description:
      'Temukan pola pelanggan loyal dan rentan melalui segmentasi visual yang membantu keputusan lebih cepat.',
  },
  {
    icon: 'fa-solid fa-wand-magic-sparkles',
    accent: '#ef4444',
    title: 'Rekomendasi Aksi',
    description:
      'Ubah insight menjadi tindakan retensi terukur dengan ringkasan risiko, tren, dan peluang intervensi.',
  },
];

const stats = [
  { value: '85%', label: 'akurasi model' },
  { value: '3 level', label: 'prioritas risiko' },
  { value: 'AI', label: 'insight assistant' },
];

const insightCards = [
  { label: 'High risk', value: '128', tone: 'bg-red-500' },
  { label: 'Need follow-up', value: '42%', tone: 'bg-amber-400' },
  { label: 'Saved revenue', value: 'Rp 76M', tone: 'bg-teal-500' },
];

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 w-full min-h-screen overflow-hidden bg-[#f5efe4] text-[#15201d] antialiased">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(0,166,166,0.26),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(245,158,11,0.24),transparent_25%),radial-gradient(circle_at_50%_95%,rgba(239,68,68,0.16),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(21,32,29,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(21,32,29,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <nav className="relative z-50 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[#15201d]/10 bg-[#fffaf0]/75 px-4 py-3 shadow-[0_20px_70px_rgba(21,32,29,0.08)] backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-14 w-28 items-center justify-center rounded-full px-0 sm:w-32">
              <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-10 w-auto object-contain" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.14em] text-[#15201d] sm:text-base">Ghosting Detection Unit</span>
              <span className="block text-xs font-semibold text-[#60716c]">Retention Intelligence</span>
            </span>
          </Link>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 rounded-full bg-[#15201d] px-5 py-2.5 text-sm font-bold text-[#fffaf0] shadow-[0_12px_35px_rgba(21,32,29,0.22)] transition hover:-translate-y-0.5 hover:bg-[#00a6a6]"
          >
            Login
            <i className="fa-solid fa-arrow-right-to-bracket text-xs transition group-hover:translate-x-0.5"></i>
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="fade-in">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#15201d]/10 bg-[#fffaf0]/70 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#00a6a6] shadow-sm backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#00a6a6]"></span>
                Machine Learning Retention Suite
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[#15201d] sm:text-7xl lg:text-8xl">
                Lihat sinyal churn sebelum pelanggan menghilang.
              </h1>

              <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-[#4f625d] sm:text-lg">
                Dashboard prediktif untuk membaca risiko pelanggan, memprioritaskan aksi retensi,
                dan menyajikan insight bisnis dalam tampilan yang cepat dipahami.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[#00a6a6] px-7 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_18px_45px_rgba(0,166,166,0.28)] transition hover:-translate-y-1 hover:bg-[#008f8f]"
                >
                  Mulai Analisis
                  <i className="fa-solid fa-arrow-right text-xs transition group-hover:translate-x-1"></i>
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[#15201d]/15 bg-[#fffaf0]/70 px-7 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#15201d] backdrop-blur transition hover:-translate-y-1 hover:bg-white"
                >
                  Jelajahi Fitur
                </a>
              </div>

              <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-[#15201d]/10 bg-[#fffaf0]/75 p-4 backdrop-blur">
                    <div className="text-2xl font-black text-[#15201d] sm:text-3xl">{stat.value}</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#60716c]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl fade-in stagger-2">
              <div className="absolute -left-8 top-12 h-24 w-24 rounded-full bg-[#ef4444]/20 blur-2xl" />
              <div className="absolute -right-6 bottom-10 h-32 w-32 rounded-full bg-[#00a6a6]/25 blur-2xl" />
              <div className="relative rotate-1 rounded-[2rem] border border-[#15201d]/10 bg-[#15201d] p-4 shadow-[0_35px_100px_rgba(21,32,29,0.24)] transition duration-500 hover:rotate-0">
                <div className="rounded-[1.5rem] bg-[#fffaf0] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-28 items-center justify-center rounded-2xl px-0">
                                              <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-10 w-auto object-contain" />
                                            </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00a6a6]">Live Dashboard</p>
                                                <h2 className="text-lg font-black text-[#15201d]">Ghosting Detection Unit</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Online</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {insightCards.map((card) => (
                      <div key={card.label} className="rounded-2xl border border-[#15201d]/10 bg-white p-4 shadow-sm">
                        <span className={`mb-3 block h-2 w-10 rounded-full ${card.tone}`}></span>
                        <p className="text-xs font-bold text-[#60716c]">{card.label}</p>
                        <p className="mt-1 text-2xl font-black text-[#15201d]">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-3xl bg-[#15201d] p-5 text-[#fffaf0]">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-black">Risk Distribution</p>
                      <p className="text-xs text-[#fffaf0]/60">last 30 days</p>
                    </div>
                    <div className="flex h-36 items-end gap-3">
                      {[45, 72, 38, 88, 54, 66, 92].map((height, index) => (
                        <div key={height + index} className="flex-1 rounded-t-2xl bg-[#fffaf0]/10 p-1">
                          <div
                            className="rounded-t-xl bg-gradient-to-t from-[#00a6a6] via-[#f59e0b] to-[#ef4444] transition-all duration-700"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ef4444]">Fitur utama</p>
                <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.04em] text-[#15201d] sm:text-5xl">
                  Dibuat untuk tim yang ingin bergerak sebelum churn terjadi.
                </h2>
              </div>
              <p className="max-w-md text-sm font-medium leading-7 text-[#60716c]">
                Dari prediksi, visualisasi, hingga rekomendasi aksi, semua dirancang agar data retensi terasa jelas dan actionable.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="group rounded-[2rem] border border-[#15201d]/10 bg-[#fffaf0]/75 p-7 shadow-[0_18px_60px_rgba(21,32,29,0.07)] backdrop-blur transition duration-300 hover:-translate-y-2 hover:bg-white"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition group-hover:rotate-6 group-hover:scale-110" style={{ background: feature.accent }}>
                    <i className={`${feature.icon} text-xl`}></i>
                  </div>
                  <h3 className="text-xl font-black tracking-[-0.02em] text-[#15201d]">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-[#60716c]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#15201d] p-8 text-center text-[#fffaf0] shadow-[0_35px_100px_rgba(21,32,29,0.2)] sm:p-14">
            <div className="mx-auto mb-6 flex h-24 w-52 items-center justify-center rounded-3xl px-0">
              <img src={logoSrc} alt="Ghosting Detection Unit logo" className="h-16 w-auto object-contain" />
            </div>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">Siap membaca risiko pelanggan hari ini?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#fffaf0]/70 sm:text-base">
              Masuk ke dashboard dan ubah data pelanggan menjadi keputusan retensi yang lebih cepat.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#f59e0b] px-7 py-4 text-sm font-black uppercase tracking-[0.12em] text-[#15201d] transition hover:-translate-y-1 hover:bg-[#ffb52e]"
            >
              Masuk ke Dashboard
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
