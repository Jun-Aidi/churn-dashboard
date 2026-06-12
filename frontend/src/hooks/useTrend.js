import { useQuery } from '@tanstack/react-query';
import { fetchTrend } from '../api/index';

export function useTrend() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trend'],
    queryFn: fetchTrend,
  });

  return {
    trendData: data || [],
    loading: isLoading,
    error: error ? (error.message || 'Gagal memuat data') : null,
  };
}
