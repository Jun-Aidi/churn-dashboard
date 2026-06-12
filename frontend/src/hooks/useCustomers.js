import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    churned: c.risk_score >= 57.37 ? 1 : 0, // Updated to use the actual model threshold
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
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  const normalized = (data || []).map(normalize);
  const counts = buildCounts(normalized);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  return {
    customers: normalized,
    counts,
    total: normalized.length,
    loading: isLoading,
    error: error ? (error.message || 'Gagal memuat data') : null,
    refresh,
  };
}

export function useCustomer(id) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomer(id),
    enabled: Boolean(id),
  });

  return {
    customer: data ? normalize(data) : null,
    loading: isLoading,
    error: error ? (error.message || 'Gagal memuat data') : null,
  };
}
