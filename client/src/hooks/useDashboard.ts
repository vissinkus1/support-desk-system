import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  waitingOnCustomer: number;
  resolved: number;
  urgent: number;
  overdue: number;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    get<DashboardStats>('/api/dashboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

