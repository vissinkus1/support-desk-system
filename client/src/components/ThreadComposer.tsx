import { useState } from 'react';
import { post } from '../api/client';
import { getActingAgent } from './Header';
import type { TicketEntry } from '../hooks/useTicketDetail';

interface Props {
  ticketId: number;
  onEntryAdded: (newEntry: TicketEntry) => void;
}

export default function ThreadComposer({ ticketId, onEntryAdded }: Props) {
  const [type, setType] = useState<'reply' | 'note'>('reply');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actingAgent = getActingAgent();
  const authorName = actingAgent ? actingAgent.name : 'Support Agent';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const entry = await post<TicketEntry>(`/api/tickets/${ticketId}/entries`, {
        type,
        content: trimmed,
        author: authorName,
      });
      setContent('');
      onEntryAdded(entry);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send entry');
    } finally {
      setSubmitting(false);
    }
  }

  const isReply = type === 'reply';

  return (
    <div className={`composer-box ${isReply ? 'composer-box--reply' : 'composer-box--note'}`}>
      <div className="composer-tabs">
        <button
          type="button"
          className={`composer-tab tab--reply ${isReply ? 'active' : ''}`}
          onClick={() => setType('reply')}
        >
          Public reply
        </button>
        <button
          type="button"
          className={`composer-tab tab--note ${!isReply ? 'active' : ''}`}
          onClick={() => setType('note')}
        >
          🔒 Internal note
        </button>
      </div>

      <form className="composer-body" onSubmit={handleSubmit}>
        <textarea
          className="composer-textarea"
          rows={3}
          placeholder={
            isReply
              ? 'Draft a response to the customer…'
              : 'Add a private note for other agents (not visible to customer)…'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
        />

        {error && <div className="form-error" style={{ marginTop: '0.4rem' }}>{error}</div>}

        <div className="composer-footer">
          <span className="composer-acting-hint">
            Posting as <strong>{authorName}</strong>
          </span>

          <button
            type="submit"
            className={isReply ? 'btn-primary' : 'btn-note'}
            disabled={!content.trim() || submitting}
          >
            {submitting
              ? 'Posting…'
              : isReply
                ? 'Send reply'
                : 'Add internal note'}
          </button>
        </div>
      </form>
    </div>
  );
}

