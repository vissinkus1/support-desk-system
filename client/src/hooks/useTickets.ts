import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';

export interface Ticket {
  id: number;
  subject: string;
  customer: string;
  description: string;
  priority: string;
  status: string;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  isOverdue: boolean;
}

export interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  sort?: string;
}

export function useTickets(filters: TicketFilters) {
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query string from filters
  const qs = buildQuery(filters);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    get<Ticket[]>(`/api/tickets${qs}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [qs]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

function buildQuery(filters: TicketFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.sort) params.set('sort', filters.sort);
  const str = params.toString();
  return str ? `?${str}` : '';
}

