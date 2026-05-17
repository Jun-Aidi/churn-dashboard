import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './Navbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full transition-colors duration-200" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[98] bg-black/40 backdrop-blur-sm"
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className="flex flex-1 flex-col min-h-screen transition-[margin-left] duration-[250ms] ease-in-out"
        style={{ marginLeft: 'var(--sidebar-w, 64px)' }}
      >
        <TopNavbar onMenuClick={() => setSidebarOpen(o => !o)} />

        <main
          className="flex-1 mt-[60px] transition-colors duration-200"
          style={{ padding: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)', background: 'var(--color-bg)' }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          :root { --sidebar-w: 0px !important; }
        }
      `}</style>
    </div>
  );
}
