import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRiskClass } from '../../api/index';
import Badge from './Badge';

export default function Table({ customers }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 650 }}>
        <thead>
          <tr>
            {['Customer ID', 'Nama', 'Plan', 'Skor Risiko', 'Kategori', 'Tenure', 'Aksi'].map(h => (
              <th key={h} className="text-left text-[11.5px] font-semibold tracking-[0.6px] uppercase pb-3 px-3 whitespace-nowrap"
                style={{ color: 'var(--color-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c, idx) => {
            const risk = getRiskClass(c.score);
            return (
              <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                className="cursor-pointer transition-[background] duration-150"
                style={{ borderBottom: idx < customers.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-row-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td className="px-3 py-[13px] font-mono text-[12.5px]" style={{ color: 'var(--color-subtle)' }}>{c.id}</td>
                <td className="px-3 py-[13px] text-[13.5px] font-medium" style={{ color: 'var(--color-text)' }}>{c.name}</td>
                <td className="px-3 py-[13px]">
                  <span className="text-xs px-2 py-0.5 rounded border" style={{ background: 'var(--color-input)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {c.plan}
                  </span>
                </td>
                <td className="px-3 py-[13px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-20 h-[5px] rounded overflow-hidden" style={{ background: 'var(--color-hover)' }}>
                      <div className="h-full rounded" style={{ width: `${c.score}%`, background: risk.color }} />
                    </div>
                    <span className="font-mono text-[12.5px] font-semibold" style={{ color: 'var(--color-text)' }}>{c.score}</span>
                  </div>
                </td>
                <td className="px-3 py-[13px]"><Badge riskObj={risk} /></td>
                <td className="px-3 py-[13px] text-[13px]" style={{ color: 'var(--color-muted)' }}>{c.tenure} bln</td>
                <td className="px-3 py-[13px]">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                    className="text-[12.5px] font-semibold text-[#4f8ef7] bg-transparent border-none cursor-pointer transition-opacity duration-150 font-[inherit] hover:opacity-70"
                  >Detail <i className="fa-solid fa-angle-right ml-1"></i></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
