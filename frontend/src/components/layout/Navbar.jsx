import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const navLinks = [
  { to: '/',          label: 'Overview',  end: true },
  { to: '/customers', label: 'Pelanggan' },
  { to: '/predict',   label: 'Prediksi' },
  { to: '/model',     label: 'Model' },
];

export default function TopNavbar({ onMenuClick }) {
  const [searchVal, setSearchVal] = useState('');
  const { dark, toggle } = useTheme();

  return (
    <header
      className="top-navbar fixed top-0 right-0 z-[90] h-[60px] flex items-center transition-colors duration-200"
      style={{
        left: 64,
        padding: '0 20px 0 24px',
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="mobile-menu-btn hidden items-center justify-center w-9 h-9 rounded-[9px] cursor-pointer mr-3 flex-shrink-0 border transition-colors"
        style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}
      >
        <i className="fa-solid fa-bars text-sm"></i>
      </button>

      {/* Brand */}
      <div className="font-bold text-[15px] tracking-[-0.3px] mr-7 flex-shrink-0" style={{ color: 'var(--color-text)' }}>
        Maul en de geng
      </div>

      {/* Nav links */}
      <nav className="top-nav-links flex items-center gap-0.5 flex-1">
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              textDecoration: 'none',
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? '#4f8ef7' : 'var(--color-muted)',
              padding: '6px 14px',
              borderRadius: 8,
              background: isActive ? (dark ? 'rgba(79,142,247,0.15)' : '#eff6ff') : 'transparent',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div
          className="top-search flex items-center gap-2 rounded-[10px] px-[13px] py-[7px] w-[190px] border transition-colors duration-200"
          style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)' }}
        >
          <i className="fa-solid fa-magnifying-glass text-[13px]" style={{ color: 'var(--color-subtle)' }}></i>
          <input
            type="text"
            placeholder="Cari..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] w-full font-[inherit]"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="relative w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer transition-all duration-200 border flex-shrink-0"
          style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}
          title={dark ? 'Mode Terang' : 'Mode Gelap'}
        >
          <i className={`fa-solid ${dark ? 'fa-sun text-yellow-400' : 'fa-moon text-[#6b7280]'} text-sm`}></i>
        </button>

        {/* Bell */}
        <button
          className="relative w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer transition-colors duration-200 border flex-shrink-0"
          style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)', color: 'var(--color-text)' }}
        >
          <i className="fa-solid fa-bell text-sm"></i>
          <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-red-500 rounded-full border-2 border-white dark:border-[#161b27]"></span>
        </button>

        {/* User profile */}
        <div
          className="flex items-center gap-2 py-1 pl-1 pr-[10px] rounded-[10px] cursor-pointer transition-colors duration-200 border flex-shrink-0"
          style={{ background: 'var(--color-input)', borderColor: 'var(--color-border-input)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 tracking-[-0.5px]"
            style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #8b5cf6 100%)' }}
          >
            CS
          </div>
          <div className="user-name-block leading-[1.2]">
            <div className="text-[12.5px] font-semibold" style={{ color: 'var(--color-text)' }}>CS Team</div>
            <div className="text-[10.5px]" style={{ color: 'var(--color-muted)' }}>Admin</div>
          </div>
          <i className="fa-solid fa-chevron-down text-[10px] user-name-block" style={{ color: 'var(--color-subtle)' }}></i>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .top-navbar { left: 0 !important; padding: 0 14px !important; }
          .mobile-menu-btn { display: flex !important; }
          .top-nav-links { display: none !important; }
          .top-search { width: 130px !important; }
          .user-name-block { display: none !important; }
        }
        @media (max-width: 480px) {
          .top-search { display: none !important; }
        }
      `}</style>
    </header>
  );
}
