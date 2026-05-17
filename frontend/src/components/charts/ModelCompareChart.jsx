import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

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
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={12} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e4da" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a8270', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#8a8270', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: 'DM Sans' }} />
          <Bar dataKey="accuracy"  name="Accuracy"  fill="#c9a84c" radius={[3,3,0,0]} />
          <Bar dataKey="precision" name="Precision" fill="#2da44e" radius={[3,3,0,0]} />
          <Bar dataKey="recall"    name="Recall"    fill="#e03d3d" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
