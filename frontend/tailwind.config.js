/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        // Dynamic — switches with dark mode via CSS vars
        bg:     'var(--color-bg)',
        card:   'var(--color-card)',
        border: 'var(--color-border)',
        text:   'var(--color-text)',
        muted:  'var(--color-muted)',
        subtle: 'var(--color-subtle)',
        input:  'var(--color-input)',
        hover:  'var(--color-hover)',

        // Static — same in both modes
        sidebar: '#16181d',
        'sidebar-hover': 'rgba(255,255,255,0.08)',
        accent: '#4f8ef7',
        'accent-dark': '#3b6fe0',
        'accent-light': '#eff6ff',

        // Risk colors
        high: '#dc2626', 'high-bg': '#fef2f2',
        med:  '#d97706', 'med-bg':  '#fffbeb',
        low:  '#16a34a', 'low-bg':  '#f0fdf4',
      },
      boxShadow: {
        card: '0 1px 6px rgba(0,0,0,0.05)',
        elevated: '0 4px 20px rgba(0,0,0,0.08)',
        'blue': '0 4px 14px rgba(79,142,247,0.35)',
      },
      borderRadius: {
        card: '14px',
        input: '10px',
      },
    },
  },
  plugins: [],
};
