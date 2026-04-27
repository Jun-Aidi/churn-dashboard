import React from 'react';

const cardStyles = {
  total: { borderTop: '3px solid #1a1710' },
  high:  { borderTop: '3px solid #e03d3d' },
  med:   { borderTop: '3px solid #d4a017' },
  low:   { borderTop: '3px solid #2da44e' },
};

const badgeStyles = {
  green:  { background: '#edfaf2', color: '#2da44e' },
  red:    { background: '#fdf0f0', color: '#e03d3d' },
  yellow: { background: '#fdf9ee', color: '#d4a017' },
};

/**
 * @param {object} props
 * @param {'total'|'high'|'med'|'low'} props.variant
 * @param {React.ReactNode} props.icon
 * @param {string} props.badgeText  e.g. "+5.2%"
 * @param {'green'|'red'|'yellow'} props.badgeColor
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.valueColor]
 * @param {string} [props.className]
 * @param {string} [props.animClass] e.g. "stagger-1"
 */
export default function StatCard({
  variant = 'total',
  icon,
  badgeText,
  badgeColor = 'green',
  label,
  value,
  valueColor,
  animClass = '',
}) {
  return (
    <div
      className={`relative overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 fade-in ${animClass}`}
      style={{
        background: '#ffffff',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        border: '1px solid #e8e4da',
        ...cardStyles[variant],
      }}
    >
      <div className="flex justify-between items-center mb-2.5">
        <span style={{ fontSize: 20 }}>{icon}</span>
        {badgeText && (
          <span
            style={{
              fontSize: 11.5, fontWeight: 600,
              padding: '3px 8px', borderRadius: 20,
              ...badgeStyles[badgeColor],
            }}
          >
            {badgeText}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#8a8270', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', color: valueColor || '#1a1710' }}>
        {value}
      </div>
    </div>
  );
}
