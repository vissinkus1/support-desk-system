import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';
import type { Ticket } from './useTickets';

export interface TicketEntry {
  id: number;
  ticket_id: number;
  type: 'reply' | 'note';
  content: string;
  author: string;
  created_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  type: string;
  from_value: string | null;
  to_value: string | null;
  actor: string;
  created_at: string;
}

export interface TicketDetailData {
  ticket: Ticket;
  entries: TicketEntry[];
  events: TicketEvent[];
}

export function useTicketDetail(id: number | null) {
  const [data, setData] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (id === null || isNaN(id)) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    get<TicketDetailData>(`/api/tickets/${id}`)
      .then((res) => {
        setData(res);
        setNotFound(false);
      })
      .catch((err) => {
        if (err.status === 404) {
          setNotFound(true);
        } else {
          setError(err.message || 'Failed to load ticket');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, notFound, error, refetch, setData };
}

