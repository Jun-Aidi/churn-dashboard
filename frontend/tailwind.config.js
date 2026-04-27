/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        bg: '#f5f3ee',
        sidebar: '#2a2418',
        'sidebar-hover': '#3d3526',
        'sidebar-active': '#c9a84c',
        card: '#ffffff',
        border: '#e8e4da',
        text: '#1a1710',
        muted: '#8a8270',
        high: '#e03d3d',
        'high-bg': '#fdf0f0',
        med: '#d4a017',
        'med-bg': '#fdf9ee',
        low: '#2da44e',
        'low-bg': '#edfaf2',
        accent: '#c9a84c',
        'accent-light': '#f7f0dd',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
        elevated: '0 8px 24px rgba(0,0,0,0.11)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
