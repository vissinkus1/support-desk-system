import type { TicketEntry } from '../hooks/useTicketDetail';
import { parseUtc, relativeTime, formatExact } from '../utils/dates';

interface Props {
  entries: TicketEntry[];
}

export default function ConversationThread({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="state-message" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0 }}>No replies or notes yet. Start the conversation below.</p>
      </div>
    );
  }

  // Sorted chronological (oldest first)
  const sorted = [...entries].sort(
    (a, b) => parseUtc(a.created_at).getTime() - parseUtc(b.created_at).getTime(),
  );

  return (
    <div className="thread-list">
      {sorted.map((entry) => {
        const date = parseUtc(entry.created_at);
        const isNote = entry.type === 'note';

        return (
          <div
            key={entry.id}
            className={`entry-card ${isNote ? 'entry-card--note' : 'entry-card--reply'}`}
          >
            <div className="entry-card__header">
              <span className={`entry-tag ${isNote ? 'entry-tag--note' : 'entry-tag--reply'}`}>
                {isNote ? '🔒 INTERNAL NOTE - not visible to customer' : 'PUBLIC REPLY'}
              </span>

              <div className="entry-card__meta">
                <span className="entry-card__author">{entry.author}</span>
                <span
                  className="entry-card__time"
                  title={formatExact(date)}
                >
                  {relativeTime(date)}
                </span>
              </div>
            </div>

            <div className="entry-card__content">{entry.content}</div>
          </div>
        );
      })}
    </div>
  );
}

