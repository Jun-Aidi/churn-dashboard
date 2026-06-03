import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/',          icon: 'fa-solid fa-gauge-high',          label: 'Dashboard', end: true },
  { to: '/customers', icon: 'fa-solid fa-users',               label: 'Pelanggan' },
  { to: '/upload',    icon: 'fa-solid fa-upload',              label: 'Upload Data' },
];

const bottomItems = [
  { icon: 'fa-solid fa-gear',               label: 'Pengaturan' },
  { icon: 'fa-solid fa-right-from-bracket', label: 'Keluar' },
];

const Tooltip = ({ label }) => (
  <div
    className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 bg-[#1e2028] text-white text-xs font-medium px-[11px] py-[5px] rounded-lg whitespace-nowrap pointer-events-none z-[999] border border-white/[0.08]"
    style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}
  >
    {label}
    <span
      className="absolute right-full top-1/2 -translate-y-1/2"
      style={{ borderWidth: 5, borderStyle: 'solid', borderColor: 'transparent #1e2028 transparent transparent' }}
    />
  </div>
);

export default function Sidebar({ mobileOpen, onClose }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <aside className="sidebar-aside fixed top-0 left-0 z-[100] w-16 min-h-screen bg-sidebar flex flex-col items-center pt-4 pb-5 border-r border-white/[0.06] transition-transform duration-[250ms] ease-in-out">

      {/* Logo */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-7 flex-shrink-0 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)', boxShadow: '0 4px 12px rgba(79,142,247,0.4)' }}
      >
        <i className="fa-solid fa-gauge-high text-white text-base"></i>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 w-full px-[10px]">
        {navItems.map(({ to, icon, label, end }) => (
          <div key={to} className="relative">
            <NavLink
              to={to}
              end={end}
              onClick={onClose}
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
              className="sidebar-nav-item"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 11, margin: '0 auto',
                background: isActive ? 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                boxShadow: isActive ? '0 2px 10px rgba(79,142,247,0.4)' : 'none',
                textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
              })}
            >
              <i className={`${icon} text-[19px]`}></i>
            </NavLink>
            {tooltip === label && <Tooltip label={label} />}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-8 h-px bg-white/[0.07] my-2" />

      {/* Bottom items */}
      <div className="flex flex-col gap-1 w-full px-[10px]">
        {bottomItems.map(({ icon, label }) => (
          <div key={label} className="relative">
            <button
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
              className="sidebar-nav-item flex items-center justify-center w-11 h-11 rounded-[11px] bg-transparent text-white/30 border-none cursor-pointer transition-all duration-150 mx-auto"
            >
              <i className={`${icon} text-[18px]`}></i>
            </button>
            {tooltip === label && <Tooltip label={label} />}
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-aside { transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}; }
        }
      `}</style>
    </aside>
  );
}
