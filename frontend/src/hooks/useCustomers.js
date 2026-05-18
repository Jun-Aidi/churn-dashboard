import { useState, useEffect } from 'react';
import { fetchCustomers, fetchCustomer, getRiskClass } from '../api/index';

/**
 * Normalize backend customer object to the shape expected by UI components.
 * Backend returns: customer_id, plan_type, contract_type, tenure_days, monthly_usage_hrs, etc.
 * UI expects: id, name, plan, contract, tenure, usage, adoption, tickets, lastLogin, nps, delay, score, churned
 */
function normalize(c) {
  return {
    id: c.customer_id,
    name: c.customer_id, // Use ID as name (dataset has no name column)
    plan: capitalize(c.plan_type),
    contract: capitalize(c.contract_type),
    tenure: c.tenure_months,
    revenue: c.monthly_revenue,
    usage: c.monthly_usage_hrs,
    users: c.total_users,
    adoption: c.feature_adoption_pct,
    tickets: c.ticket_count,
    lastLogin: c.days_since_login,
    nps: c.nps_latest,
    delay: c.late_payment_count,
    score: c.risk_score,
    churned: c.risk_class === 'high' ? 1 : 0, // Approximate: high risk = likely churned
    risk_class: c.risk_class,
    risk_label: c.risk_label,
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [counts, setCounts] = useState({ high: 0, med: 0, low: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchCustomers();
        if (cancelled) return;

        const normalized = raw.map(normalize);
        const c = buildCounts(normalized);

        setCustomers(normalized);
        setCounts(c);
        setTotal(normalized.length);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { customers, counts, total, loading, error };
}

export function useCustomer(id) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchCustomer(id);
        if (cancelled) return;
        setCustomer(normalize(raw));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  return { customer, loading, error };
}
