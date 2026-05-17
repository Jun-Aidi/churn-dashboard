import React from 'react';
import ModelCompareChart from '../components/charts/ModelCompareChart';

const card = { background: 'var(--color-card)', borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--color-card-shadow)', border: '1px solid var(--color-border)' };

const models = [
  { name: 'Random Forest', accuracy: '85%', precision: '83%', recall: '87%', f1: '85%', auc: '0.91', best: true },
];

export default function ModelComparison() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Perbandingan Model</h1>
          <p className="page-subtitle">Evaluasi performa model prediksi churn</p>
        </div>
        <div className="flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] px-3.5 py-2 text-[12.5px] text-blue-600 font-semibold">
          <i className="fa-solid fa-brain"></i> Machine Learning Models
        </div>
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>Visualisasi Performa Model</div>
        <div className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>Accuracy, Precision, dan Recall tiap model ML</div>
        <ModelCompareChart />
      </div>

      <div style={card}>
        <div className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Detail Metrik Model</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Model', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC-ROC'].map(h => (
                  <th key={h} className="text-left text-[11.5px] font-semibold tracking-[0.6px] uppercase pb-3 px-3 whitespace-nowrap"
                    style={{ color: 'var(--color-subtle)', borderBottom: '1px solid var(--color-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.name} style={{ borderBottom: i < models.length - 1 ? '1px solid var(--color-border)' : 'none', background: m.best ? 'rgba(79,142,247,0.08)' : 'transparent' }}>
                  <td className="px-3 py-3.5 text-[13.5px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {m.name}
                    {m.best && (
                      <span className="ml-2 text-[10.5px] font-bold text-white px-2 py-0.5 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #4f8ef7 0%, #3b6fe0 100%)' }}>Best</span>
                    )}
                  </td>
                  {[m.accuracy, m.precision, m.recall, m.f1, m.auc].map((val, j) => (
                    <td key={j} className="px-3 py-3.5 text-[13.5px] font-mono font-semibold" style={{ color: m.best ? '#4f8ef7' : 'var(--color-text)' }}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
