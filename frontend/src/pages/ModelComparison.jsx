import React from 'react';
import ModelCompareChart from '../components/charts/ModelCompareChart';
import Navbar from '../components/layout/Navbar';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '22px 24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  border: '1px solid #e8e4da',
  marginBottom: 24,
};

const models = [
  { name: 'Logistic Regression', accuracy: '78%', precision: '74%', recall: '82%', f1: '77%', auc: '0.82' },
  { name: 'Random Forest',       accuracy: '85%', precision: '83%', recall: '87%', f1: '85%', auc: '0.91' },
  { name: 'XGBoost',             accuracy: '88%', precision: '87%', recall: '89%', f1: '88%', auc: '0.94' },
  { name: 'Neural Network',      accuracy: '91%', precision: '90%', recall: '92%', f1: '91%', auc: '0.96', best: true },
];

export default function ModelComparison() {
  return (
    <div className="fade-in">
      <Navbar
        title="Perbandingan Model"
        subtitle="Evaluasi performa model prediksi churn"
      />

      {/* Chart */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Visualisasi Performa Model</div>
        <div style={{ fontSize: 12, color: '#8a8270', marginBottom: 18 }}>Accuracy, Precision, dan Recall tiap model ML</div>
        <ModelCompareChart />
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Detail Metrik Model</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Model', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC-ROC'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left', fontSize: 11.5, fontWeight: 600,
                    color: '#8a8270', letterSpacing: '0.6px',
                    textTransform: 'uppercase', padding: '0 12px 12px',
                    borderBottom: '1px solid #e8e4da',
                  }}
                >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map((m, i) => (
              <tr
                key={m.name}
                style={{
                  borderBottom: i < models.length - 1 ? '1px solid #e8e4da' : 'none',
                  background: m.best ? '#f7f0dd' : 'transparent',
                }}
              >
                <td style={{ padding: '13px 12px', fontSize: 13.5, fontWeight: 600 }}>
                  {m.name}
                  {m.best && (
                    <span style={{
                      marginLeft: 8, fontSize: 10.5, fontWeight: 700,
                      background: '#c9a84c', color: '#1a1710',
                      padding: '2px 7px', borderRadius: 20,
                    }}>Best</span>
                  )}
                </td>
                {[m.accuracy, m.precision, m.recall, m.f1, m.auc].map((val, j) => (
                  <td key={j} style={{
                    padding: '13px 12px', fontSize: 13.5,
                    fontFamily: 'DM Mono, monospace', fontWeight: 600,
                    color: m.best ? '#c9a84c' : '#1a1710',
                  }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
