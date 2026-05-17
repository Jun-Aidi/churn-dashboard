import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const data = [
  { name: 'Random Forest', accuracy: 85, precision: 83, recall: 87 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 12, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  );
};

export default function ModelCompareChart() {
  const { dark } = useTheme();

  const gridColor  = dark ? '#252f45' : '#e8e4da';
  const tickColor  = dark ? '#5d6e82' : '#8a8270';

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={12} barGap={4} background={false}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: tickColor, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} cursor={false} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans', color: tickColor }} />
          <Bar dataKey="accuracy"  name="Accuracy"  fill="#c9a84c" radius={[3,3,0,0]} />
          <Bar dataKey="precision" name="Precision" fill="#2da44e" radius={[3,3,0,0]} />
          <Bar dataKey="recall"    name="Recall"    fill="#e03d3d" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
