import { useState } from 'react';

// Static mock trend data — no backend required
const MOCK_TREND = [
  { month: 'Des', high: 3, med: 4, low: 5 },
  { month: 'Jan', high: 4, med: 3, low: 5 },
  { month: 'Feb', high: 3, med: 5, low: 4 },
  { month: 'Mar', high: 5, med: 3, low: 4 },
  { month: 'Apr', high: 4, med: 4, low: 4 },
  { month: 'Mei', high: 4, med: 2, low: 3 },
];

export function useTrend() {
  const [trendData] = useState(MOCK_TREND);
  const [loading]   = useState(false);
  const [error]     = useState(null);

  return { trendData, loading, error };
}
