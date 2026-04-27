import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, TrendingUp } from 'lucide-react';

const navItems = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Pelanggan',  icon: Users },
  { to: '/predict',   label: 'Prediksi',   icon: TrendingUp },
];

export default function Sidebar() {
  return (
    <nav
      className="fixed top-0 left-0 z-50 flex flex-col"
      style={{
        width: 220,
        minHeight: '100vh',
        background: '#2a2418',
        padding: '28px 0',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 pb-7"
        style={{
          padding: '0 22px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34, height: 34,
            background: '#c9a84c',
            borderRadius: 9,
            fontSize: 15,
          }}
        >
          📈
        </div>
        <span
          style={{
            fontSize: 15, fontWeight: 700,
            color: '#fff', letterSpacing: '-0.3px',
          }}
        >
          ChurnPredict
        </span>
      </div>

      {/* Nav items */}
      <div
        className="flex-1 flex flex-col mt-5"
        style={{ gap: 2, padding: '0 12px' }}
      >
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[9px] cursor-pointer select-none transition-all duration-150 ${
                isActive
                  ? 'font-semibold'
                  : 'font-medium'
              }`
            }
            style={({ isActive }) => ({
              padding: '10px 12px',
              fontSize: 13.5,
              color: isActive ? '#1a1710' : 'rgba(255,255,255,0.55)',
              background: isActive ? '#c9a84c' : 'transparent',
              textDecoration: 'none',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = '#3d3526';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              }
            }}
            onMouseLeave={e => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ width: 18, flexShrink: 0 }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 22px 0',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.3px',
          lineHeight: 1.6,
        }}
      >
        Customer Churn Prediction<br />v2.1.0
      </div>
    </nav>
  );
}
