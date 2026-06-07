import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './Navbar';
import CopilotWidget from '../copilot/CopilotWidget';

export default function Layout() {
  return (
    <div className="flex min-h-screen w-full flex-col transition-colors duration-200" style={{ background: 'var(--color-bg)' }}>
      <TopNavbar />

      <main
        className="flex-1 mt-[60px] transition-colors duration-200 w-full"
        style={{ padding: 'clamp(12px, 3vw, 28px) clamp(12px, 3vw, 32px)', background: 'var(--color-bg)', maxWidth: '100%', overflowX: 'hidden' }}
      >
        <Outlet />
      </main>

      {/* Chatbot — only available inside the dashboard */}
      <CopilotWidget />
    </div>
  );
}
