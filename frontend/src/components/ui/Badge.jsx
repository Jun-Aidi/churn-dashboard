import React from 'react';

const styles = {
  high: { background: 'rgba(220,61,61,0.12)',  color: '#e03d3d' },
  med:  { background: 'rgba(212,160,23,0.12)', color: '#d4a017' },
  low:  { background: 'rgba(45,164,78,0.12)',  color: '#2da44e' },
};

/**
 * @param {{ cls: 'high'|'med'|'low', label: string }} riskObj
 */
export default function Badge({ riskObj, size = 'md' }) {
  if (!riskObj) return null;
  const { cls, label } = riskObj;
  const fontSize = size === 'sm' ? 11 : 11.5;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold rounded-full"
      style={{
        fontSize,
        padding: '3px 10px',
        ...styles[cls],
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: styles[cls].color }}
      />
      {label}
    </span>
  );
}
