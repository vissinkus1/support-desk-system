import type { TicketEvent } from '../hooks/useTicketDetail';
import { useAgents } from '../hooks/useAgents';
import { parseUtc, relativeTime, formatExact } from '../utils/dates';

interface Props {
  events: TicketEvent[];
}

export default function ActivityHistory({ events }: Props) {
  const { data: agents } = useAgents();

  function getAgentName(idStr: string | null): string {
    if (!idStr) return 'Unassigned';
    const num = Number(idStr);
    const agent = agents.find((a) => a.id === num);
    return agent ? agent.name : `Agent #${idStr}`;
  }

  function formatSentence(evt: TicketEvent): string {
    const actor = evt.actor || 'System';

    switch (evt.type) {
      case 'created':
        return `${actor} created this ticket`;
      case 'status_changed':
        return `${actor} changed status from ${evt.from_value ?? 'Unknown'} to ${evt.to_value}`;
      case 'priority_changed':
        return `${actor} changed priority from ${evt.from_value ?? 'Unknown'} to ${evt.to_value}`;
      case 'assignee_changed': {
        const fromName = getAgentName(evt.from_value);
        const toName = getAgentName(evt.to_value);
        if (!evt.from_value && evt.to_value) {
          return `${actor} assigned ticket to ${toName}`;
        }
        if (evt.from_value && !evt.to_value) {
          return `${actor} unassigned this ticket`;
        }
        return `${actor} reassigned ticket from ${fromName} to ${toName}`;
      }
      case 'reply_added':
        return `${actor} posted a public reply`;
      case 'note_added':
        return `${actor} added an internal note`;
      default:
        return `${actor} triggered ${evt.type}`;
    }
  }

  // Chronological order
  const sorted = [...events].sort(
    (a, b) => parseUtc(a.created_at).getTime() - parseUtc(b.created_at).getTime(),
  );

  return (
    <div className="sidebar-panel">
      <h3 className="sidebar-panel__title">Activity History</h3>

      {sorted.length === 0 ? (
        <p style={{ color: '#888', fontSize: '0.85rem' }}>No activity recorded yet.</p>
      ) : (
        <ul className="activity-list">
          {sorted.map((evt) => {
            const date = parseUtc(evt.created_at);
            return (
              <li key={evt.id} className="activity-item">
                <span className="activity-sentence">{formatSentence(evt)}</span>
                <span
                  className="activity-time"
                  title={formatExact(date)}
                >
                  {relativeTime(date)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

