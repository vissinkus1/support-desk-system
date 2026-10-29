import { useState } from 'react';
import { patch } from '../api/client';
import { useAgents } from '../hooks/useAgents';
import { getActingAgent } from './Header';
import type { Ticket } from '../hooks/useTickets';

const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

interface Props {
  ticket: Ticket;
  onTicketUpdated: () => void;
}

export default function TicketSidebar({ ticket, onTicketUpdated }: Props) {
  const { data: agents } = useAgents();
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFieldChange(field: string, value: unknown) {
    setSavingField(field);
    setError(null);

    const actingAgent = getActingAgent();
    const actorParam = encodeURIComponent(actingAgent ? actingAgent.name : 'system');

    try {
      await patch(`/api/tickets/${ticket.id}?actor=${actorParam}`, {
        [field]: value,
      });
      onTicketUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="sidebar-panel">
      <h3 className="sidebar-panel__title">Ticket Controls</h3>

      {/* Status control */}
      <div className="sidebar-field">
        <label htmlFor="control-status">Status</label>
        <select
          id="control-status"
          value={ticket.status}
          disabled={savingField !== null}
          onChange={(e) => handleFieldChange('status', e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Priority control */}
      <div className="sidebar-field">
        <label htmlFor="control-priority">Priority</label>
        <select
          id="control-priority"
          value={ticket.priority}
          disabled={savingField !== null}
          onChange={(e) => handleFieldChange('priority', e.target.value)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Assignee control */}
      <div className="sidebar-field">
        <label htmlFor="control-assignee">Assignee</label>
        <select
          id="control-assignee"
          value={ticket.assignee_id ?? ''}
          disabled={savingField !== null}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            handleFieldChange('assignee_id', val);
          }}
        >
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inline Feedback */}
      <div className="sidebar-status-feedback">
        {savingField && <span className="is-saving">Saving changes…</span>}
        {error && <span className="has-error">{error}</span>}
      </div>
    </div>
  );
}

