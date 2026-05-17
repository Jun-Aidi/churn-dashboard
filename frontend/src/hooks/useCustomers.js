import { useState, useEffect } from 'react';
import { customers as mockCustomers, getRiskClass } from '../api/index';

// Build counts from mock data
function buildCounts(customers) {
  return customers.reduce(
    (acc, c) => {
      const { cls } = getRiskClass(c.score);
      acc[cls] = (acc[cls] || 0) + 1;
      return acc;
    },
    { high: 0, med: 0, low: 0 }
  );
}

// Enrich customers with risk field (needed by some components)
const enriched = mockCustomers.map(c => ({
  ...c,
  risk: getRiskClass(c.score),
}));

const _counts = buildCounts(enriched);
const _total  = enriched.length;

export function useCustomers() {
  const [customers, setCustomers] = useState(enriched);
  const [counts,    setCounts]    = useState(_counts);
  const [total,     setTotal]     = useState(_total);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // No async needed — data is already in memory
  return { customers, counts, total, loading, error };
}

export function useCustomer(id) {
  const { customers, loading, error } = useCustomers();
  const customer = customers.find(c => c.id === id) || null;
  return { customer, loading, error };
}
