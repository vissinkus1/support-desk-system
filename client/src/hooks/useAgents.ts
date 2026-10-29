import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function useAgents() {
  const [data, setData] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    get<Agent[]>('/api/agents')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

