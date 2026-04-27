import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen w-full" style={{ background: '#f5f3ee' }}>
      <Sidebar />
      <main
        className="flex-1 min-h-screen"
        style={{ marginLeft: 220, padding: '32px 36px' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
