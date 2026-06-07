import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const baseNavLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-gauge-high', end: true },
  { to: '/customers', label: 'Pelanggan', icon: 'fa-solid fa-users' },
  { to: '/upload',    label: 'Upload Data', icon: 'fa-solid fa-upload' },
];

const adminNavLink = { to: '/admin', label: 'Admin', icon: 'fa-solid fa-shield-halved' };

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TopNavbar() {
  const [searchVal, setSearchVal] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dark, toggle } = useTheme();
  const { user, isAdmin, logout } = useAuth();

  const navLinks = isAdmin ? [...baseNavLinks, adminNavLink] : baseNavLinks;

  const renderLinks = (onClick) =>
    navLinks.map(({ to, label, icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onClick}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textDecoration: 'none',
          fontSize: 13.5,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? 'var(--gdu-teal)' : 'var(--gdu-muted)',
          padding: '7px 14px',
          borderRadius: 999,
          background: isActive ? 'color-mix(in srgb, var(--gdu-teal) 14%, transparent)' : 'transparent',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
        })}
      >
        <i className={`${icon} text-[13px]`}></i>
        {label}
      </NavLink>
    ));

  return (
    <header
      className="top-navbar fixed top-0 left-0 right-0 z-[90] h-[60px] flex items-center transition-colors duration-200"
      style={{
        padding: '0 20px 0 24px',
        background: 'var(--gdu-card)',
        borderBottom: '1px solid var(--gdu-border)',
        boxShadow: 'var(--gdu-shadow)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="mobile-menu-btn hidden items-center justify-center w-9 h-9 rounded-[9px] cursor-pointer mr-3 flex-shrink-0 border transition-colors"
        style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
      >
        <i className="fa-solid fa-bars text-sm"></i>
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2 mr-7 flex-shrink-0">
        <img src="/logo_ghosting.png" alt="Ghosting" className="h-10 w-auto" />
      </div>

      {/* Nav links (desktop) */}
      <nav className="top-nav-links flex items-center gap-0.5 flex-1">
        {renderLinks()}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div
          className="top-search flex items-center gap-2 rounded-[10px] px-[13px] py-[7px] w-[190px] border transition-colors duration-200"
          style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)' }}
        >
          <i className="fa-solid fa-magnifying-glass text-[13px]" style={{ color: 'var(--gdu-subtle)' }}></i>
          <input
            type="text"
            placeholder="Cari..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] w-full font-[inherit]"
            style={{ color: 'var(--gdu-text)' }}
          />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="relative w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer transition-all duration-200 border flex-shrink-0"
          style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
          title={dark ? 'Mode Terang' : 'Mode Gelap'}
        >
          <i className={`fa-solid ${dark ? 'fa-sun text-yellow-400' : 'fa-moon text-[#6b7280]'} text-sm`}></i>
        </button>

        {/* Bell */}
        <button
          className="relative w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer transition-colors duration-200 border flex-shrink-0"
          style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
        >
          <i className="fa-solid fa-bell text-sm"></i>
          <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-red-500 rounded-full border-2 border-white dark:border-[#161b27]"></span>
        </button>

        {/* User profile */}
        <div
          className="flex items-center gap-2 py-1 pl-1 pr-[10px] rounded-[10px] flex-shrink-0 border"
          style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 tracking-[-0.5px]"
            style={{ background: 'linear-gradient(135deg, var(--gdu-teal) 0%, var(--gdu-amber) 100%)' }}
          >
            {getInitials(user?.name)}
          </div>
          <div className="user-name-block leading-[1.2]">
            <div className="text-[12.5px] font-semibold" style={{ color: 'var(--gdu-text)' }}>
              {user?.name || 'Pengguna'}
            </div>
            <div className="text-[10.5px]" style={{ color: 'var(--gdu-muted)' }}>
              {isAdmin ? 'Admin' : 'User'}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-9 h-9 rounded-[9px] flex items-center justify-center cursor-pointer transition-colors duration-200 border flex-shrink-0 hover:text-red-500"
          style={{ background: 'var(--gdu-input)', borderColor: 'var(--gdu-border)', color: 'var(--gdu-text)' }}
          title="Keluar"
          aria-label="Logout"
        >
          <i className="fa-solid fa-right-from-bracket text-sm"></i>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div
          className="mobile-nav-menu absolute top-[60px] left-0 right-0 flex-col p-3 gap-1 border-b"
          style={{ display: 'none', background: 'var(--gdu-card)', borderColor: 'var(--gdu-border)', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}
        >
          {renderLinks(() => setMobileOpen(false))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .top-navbar { padding: 0 14px !important; }
          .mobile-menu-btn { display: flex !important; }
          .top-nav-links { display: none !important; }
          .top-search { width: 130px !important; }
          .user-name-block { display: none !important; }
          .mobile-nav-menu { display: flex !important; }
        }
        @media (max-width: 480px) {
          .top-search { display: none !important; }
        }
      `}</style>
    </header>
  );
}
