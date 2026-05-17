import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function RiskDonutChart({ counts, total }) {
  // Use passed props from Dashboard instead of hardcoded data
  const data = [
    { name: 'Risiko Tinggi', value: counts?.high || 0, color: COLORS.high },
    { name: 'Risiko Sedang', value: counts?.med  || 0, color: COLORS.med  },
    { name: 'Risiko Rendah', value: counts?.low  || 0, color: COLORS.low  },
  ];

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div style={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
        {/* Center text */}
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 2 }}>pelanggan</span>
        </div>
        <ResponsiveContainer width="100%" height="100%" style={{ zIndex: 10, position: 'relative' }}>
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
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 flex flex-col gap-2.5">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-2" style={{ fontSize: 12.5 }}>
            <span
              style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }}
            />
            <span className="flex-1" style={{ color: 'var(--color-muted)' }}>{item.name}</span>
            <span style={{ fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--color-text)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
