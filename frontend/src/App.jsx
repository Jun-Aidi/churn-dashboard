import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Upload from './pages/Upload';
import CopilotWidget from './components/copilot/CopilotWidget';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index            element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="upload"    element={<Upload />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <CopilotWidget />
    </BrowserRouter>
  );
}
