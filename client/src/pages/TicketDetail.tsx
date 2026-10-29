import { useParams, Link } from 'react-router-dom';
import { useTicketDetail } from '../hooks/useTicketDetail';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import OverdueTag from '../components/OverdueTag';
import ResolvedBanner from '../components/ResolvedBanner';
import TicketSidebar from '../components/TicketSidebar';
import TicketDetailsEditor from '../components/TicketDetailsEditor';
import ConversationThread from '../components/ConversationThread';
import ThreadComposer from '../components/ThreadComposer';
import ActivityHistory from '../components/ActivityHistory';
import { parseUtc, relativeTime, formatExact } from '../utils/dates';
import '../styles/detail.css';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const ticketId = id ? Number(id) : null;

  const { data, loading, notFound, error, refetch } = useTicketDetail(ticketId);

  /* ------------------------------------------------------------------ */
  /*  Loading State                                                     */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="page">
        <Link to="/tickets" className="detail-back-link">
          ← Back to Tickets
        </Link>
        <div className="detail-layout">
          <div>
            <div className="detail-header-card">
              <div className="skeleton detail-skeleton-box" style={{ width: '60%' }} />
              <div className="skeleton detail-skeleton-box" style={{ width: '40%', height: 18 }} />
            </div>
            <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius)' }} />
          </div>
          <div className="detail-sidebar">
            <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  404 Not Found State                                               */
  /* ------------------------------------------------------------------ */
  if (notFound || !data) {
    return (
      <div className="page">
        <div className="state-message">
          <h2>Ticket not found</h2>
          <p>The ticket #{id} you are looking for does not exist or may have been deleted.</p>
          <Link to="/tickets">
            <button className="btn-primary">Back to Tickets</button>
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Error State                                                       */
  /* ------------------------------------------------------------------ */
  if (error) {
    return (
      <div className="page">
        <div className="state-message">
          <h2>Error loading ticket</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { ticket, entries, events } = data;
  const isResolved = ticket.status === 'Resolved';
  const showOverdue = ticket.isOverdue && !isResolved;

  const createdDate = parseUtc(ticket.created_at);
  const updatedDate = parseUtc(ticket.updated_at);

  return (
    <div className="page">
      <Link to="/tickets" className="detail-back-link">
        ← Back to Tickets
      </Link>

      {/* Resolved banner */}
      {isResolved && <ResolvedBanner />}

      <div className="detail-layout">
        {/* Main Column */}
        <div className="detail-main">
          {/* Header Card */}
          <div className="detail-header-card">
            <div className="detail-header-top">
              <h1 className="detail-title">{ticket.subject}</h1>
              <div className="detail-badges">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                {showOverdue && <OverdueTag />}
              </div>
            </div>

            <div className="detail-meta-row">
              <span className="detail-meta-item">
                Customer: <strong>{ticket.customer}</strong>
              </span>
              <span
                className="detail-meta-item"
                title={formatExact(createdDate)}
              >
                Created: <strong>{relativeTime(createdDate)}</strong>
              </span>
              <span
                className="detail-meta-item"
                title={formatExact(updatedDate)}
              >
                Updated: <strong>{relativeTime(updatedDate)}</strong>
              </span>
            </div>

            {/* Editable description */}
            <TicketDetailsEditor ticket={ticket} onTicketUpdated={refetch} />
          </div>

          {/* Conversation Thread */}
          <section className="thread-section">
            <h2 className="thread-section__title">Conversation</h2>
            <ConversationThread entries={entries} />
            <ThreadComposer ticketId={ticket.id} onEntryAdded={refetch} />
          </section>
        </div>

        {/* Sidebar Column */}
        <aside className="detail-sidebar">
          <TicketSidebar ticket={ticket} onTicketUpdated={refetch} />
          <ActivityHistory events={events} />
        </aside>
      </div>
    </div>
  );
}

