import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskClass } from '../../api/index';
import Badge from './Badge';

/**
 * @param {{ customers: Array }} props
 */
export default function Table({ customers }) {
  const navigate = useNavigate();

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Customer ID', 'Nama', 'Plan', 'Skor Risiko', 'Kategori', 'Tenure', 'Aksi'].map(h => (
            <th
              key={h}
              style={{
                textAlign: 'left',
                fontSize: 11.5, fontWeight: 600,
                color: '#8a8270',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                padding: '0 12px 12px',
                borderBottom: '1px solid #e8e4da',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {customers.map((c, idx) => {
          const risk = getRiskClass(c.score);
          return (
            <tr
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              style={{
                borderBottom: idx < customers.length - 1 ? '1px solid #e8e4da' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f3ee'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Customer ID */}
              <td style={{ padding: '13px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12.5, color: '#8a8270' }}>
                {c.id}
              </td>
              {/* Name */}
              <td style={{ padding: '13px 12px', fontSize: 13.5, fontWeight: 500 }}>
                {c.name}
              </td>
              {/* Plan */}
              <td style={{ padding: '13px 12px' }}>
                <span style={{
                  fontSize: 12, background: '#f5f3ee',
                  border: '1px solid #e8e4da',
                  padding: '2px 8px', borderRadius: 5,
                }}>
                  {c.plan}
                </span>
              </td>
              {/* Score bar */}
              <td style={{ padding: '13px 12px' }}>
                <div className="flex items-center gap-2.5">
                  <div style={{
                    width: 80, height: 5,
                    borderRadius: 4,
                    background: '#e8e4da',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${c.score}%`,
                      background: risk.color,
                    }} />
                  </div>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12.5, fontWeight: 600 }}>
                    {c.score}
                  </span>
                </div>
              </td>
              {/* Category */}
              <td style={{ padding: '13px 12px' }}>
                <Badge riskObj={risk} />
              </td>
              {/* Tenure */}
              <td style={{ padding: '13px 12px', fontSize: 13, color: '#8a8270' }}>
                {c.tenure} bln
              </td>
              {/* Action */}
              <td style={{ padding: '13px 12px' }}>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                  style={{
                    fontSize: 12.5, fontWeight: 600,
                    color: '#c9a84c', background: 'none',
                    border: 'none', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 6,
                    transition: 'background 0.15s',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f7f0dd'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  → Detail
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
