import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { fetchFeatureImportance } from '../../api/index';

const BAR_COLORS = ['#4f8ef7', '#5b8def', '#6366f1', '#7c6ef0', '#8b5cf6', '#9d6ef0', '#a78bfa', '#c4b5fd'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="custom-tooltip">
      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.payload.label}</div>
      <div style={{ color: '#8a8270', marginTop: 2 }}>
        Importance: {(item.value * 100).toFixed(1)}%
      </div>
    </div>
  );
};

export default function FeatureImportanceChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchFeatureImportance();
        if (cancelled) return;
        setData(raw);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--color-subtle)' }}>
        <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat feature importance...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-sm text-red-600">
        <i className="fa-solid fa-triangle-exclamation mr-2"></i> {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--color-subtle)' }}>
        Data tidak tersedia.
      </div>
    );
  }

  const chartHeight = Math.max(220, data.length * 34);

  return (
    <div style={{ width: '100%', height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          barCategoryGap="22%"
        >
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 11.5, fill: 'var(--color-text)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,142,247,0.06)' }} />
          <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
