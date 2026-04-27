import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { trendData } from '../../api/index';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#1a1710' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#8a8270' }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ChurnTrendChart() {
  return (
    <div style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#e03d3d" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#e03d3d" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradMed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#d4a017" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#d4a017" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2da44e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2da44e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e4da" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8a8270', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#8a8270', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="high" name="Risiko Tinggi" stroke="#e03d3d" strokeWidth={2} fill="url(#gradHigh)" dot={{ r: 3, fill: '#e03d3d' }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="med"  name="Risiko Sedang" stroke="#d4a017" strokeWidth={2} fill="url(#gradMed)"  dot={{ r: 3, fill: '#d4a017' }} activeDot={{ r: 5 }} />
          <Area type="monotone" dataKey="low"  name="Risiko Rendah" stroke="#2da44e" strokeWidth={2} fill="url(#gradLow)"  dot={{ r: 3, fill: '#2da44e' }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
