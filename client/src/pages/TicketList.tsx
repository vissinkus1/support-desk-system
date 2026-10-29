import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { useAgents } from '../hooks/useAgents';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import OverdueTag from '../components/OverdueTag';
import { parseUtc, relativeTime } from '../utils/dates';
import '../styles/tickets.css';

const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const DEBOUNCE_MS = 300;

export default function TicketList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read filters from URL
  const urlSearch = searchParams.get('search') ?? '';
  const urlStatus = searchParams.get('status') ?? '';
  const urlPriority = searchParams.get('priority') ?? '';
  const urlAssignee = searchParams.get('assignee') ?? '';
  const urlSort = searchParams.get('sort') ?? '';

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(urlSearch);

  // Debounce search → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set('search', searchInput);
        else next.delete('search');
        return next;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setSearchParams]);

  // Sync input when URL changes externally
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const filters = useMemo(
    () => ({
      search: urlSearch || undefined,
      status: urlStatus || undefined,
      priority: urlPriority || undefined,
      assignee: urlAssignee || undefined,
      sort: urlSort || undefined,
    }),
    [urlSearch, urlStatus, urlPriority, urlAssignee, urlSort],
  );

  const { data: tickets, loading, error, refetch } = useTickets(filters);
  const { data: agents } = useAgents();

  // Helpers
  const agentName = useCallback(
    (id: number | null) => {
      if (!id) return '—';
      return agents.find((a) => a.id === id)?.name ?? `#${id}`;
    },
    [agents],
  );

  function setFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Error state                                                     */
  /* ---------------------------------------------------------------- */
  if (error) {
    return (
      <div className="page">
        <div className="state-message">
          <h2>Could not load tickets</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="page">
      <div className="tickets-page__header">
        <h1>
          Tickets
          {loading && <span className="spinner" />}
        </h1>
        <button className="btn-primary" onClick={() => navigate('/tickets/new')}>
          + New Ticket
        </button>
      </div>

      {/* Toolbar */}
      <div className="tickets-toolbar">
        <input
          type="search"
          className="tickets-toolbar__search"
          placeholder="Search subject or customer…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select
          value={urlStatus}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={urlPriority}
          onChange={(e) => setFilter('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={urlAssignee}
          onChange={(e) => setFilter('assignee', e.target.value)}
        >
          <option value="">All Assignees</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={urlSort}
          onChange={(e) => setFilter('sort', e.target.value)}
        >
          <option value="">Recently Updated</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Empty state */}
      {!loading && tickets.length === 0 && (
        <div className="state-message">
          <h2>No tickets found</h2>
          <p>
            {urlSearch || urlStatus || urlPriority || urlAssignee
              ? 'Try adjusting your filters.'
              : 'Your queue is empty — nice work!'}
          </p>
          <button className="btn-primary" onClick={() => navigate('/tickets/new')}>
            Create Ticket
          </button>
        </div>
      )}

      {/* Table */}
      {(loading || tickets.length > 0) && (
        <div className="tickets-table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th className="col-subject">Subject</th>
                <th className="col-customer">Customer</th>
                <th className="col-status">Status</th>
                <th className="col-priority">Priority</th>
                <th className="col-assignee">Assignee</th>
                <th className="col-updated">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && tickets.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td className="col-subject"><div className="skeleton skeleton-bar" style={{ width: '70%' }} /></td>
                      <td className="col-customer"><div className="skeleton skeleton-bar" style={{ width: '60%' }} /></td>
                      <td className="col-status"><div className="skeleton skeleton-bar" style={{ width: 72 }} /></td>
                      <td className="col-priority"><div className="skeleton skeleton-bar" style={{ width: 60 }} /></td>
                      <td className="col-assignee"><div className="skeleton skeleton-bar" style={{ width: '50%' }} /></td>
                      <td className="col-updated"><div className="skeleton skeleton-bar" style={{ width: 50 }} /></td>
                    </tr>
                  ))
                : tickets.map((t) => (
                    <tr
                      key={t.id}
                      className={`ticket-row-clickable ${t.isOverdue ? 'ticket-row--overdue' : ''}`}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="col-subject">
                        <div className="subject-cell-content">
                          {t.isOverdue && <OverdueTag />}
                          <span
                            className="ticket-subject-link"
                            title={t.subject}
                          >
                            {t.subject}
                          </span>
                        </div>
                      </td>
                      <td className="col-customer">
                        <span className="ticket-customer-text" title={t.customer}>
                          {t.customer}
                        </span>
                      </td>
                      <td className="col-status"><StatusBadge status={t.status} /></td>
                      <td className="col-priority"><PriorityBadge priority={t.priority} /></td>
                      <td className="col-assignee">{agentName(t.assignee_id)}</td>
                      <td className="col-updated">{relativeTime(parseUtc(t.updated_at))}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

