import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { customers, getRiskClass } from '../../api/index';

const COLORS = { high: '#e03d3d', med: '#d4a017', low: '#2da44e' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 600, color: item.payload.color }}>{item.name}</div>
      <div style={{ color: '#8a8270', marginTop: 2 }}>{item.value} pelanggan</div>
    </div>
  );
};

export default function RiskDonutChart() {
  const counts = customers.reduce((acc, c) => {
    const { cls } = getRiskClass(c.score);
    acc[cls] = (acc[cls] || 0) + 1;
    return acc;
  }, {});

  const data = [
    { name: 'Risiko Tinggi', value: counts.high || 0, color: COLORS.high },
    { name: 'Risiko Sedang', value: counts.med  || 0, color: COLORS.med  },
    { name: 'Risiko Rendah', value: counts.low  || 0, color: COLORS.low  },
  ];

  const total = customers.length;

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div style={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={42} outerRadius={62}
              dataKey="value"
              strokeWidth={2}
              stroke="#ffffff"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1710', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 9, color: '#8a8270', marginTop: 2 }}>pelanggan</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 flex flex-col gap-2.5">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
            <span
              style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }}
            />
            <span className="flex-1" style={{ color: '#8a8270' }}>{item.name}</span>
            <span style={{ fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
