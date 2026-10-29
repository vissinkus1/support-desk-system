import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useTickets } from '../hooks/useTickets';
import { useAgents } from '../hooks/useAgents';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import OverdueTag from '../components/OverdueTag';
import { parseUtc, relativeTime } from '../utils/dates';
import '../styles/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading: loadingStats, error, refetch: refetchDashboard } = useDashboard();
  const { data: tickets, loading: loadingTickets, refetch: refetchTickets } = useTickets({});
  const { data: agents } = useAgents();

  const [activeTab, setActiveTab] = useState<'attention' | 'recent'>('attention');

  // Filtered queue tickets for the main panel
  const queueTickets = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];

    if (activeTab === 'attention') {
      // Overdue first, then Urgent, then Open/In Progress
      return [...tickets]
        .filter((t) => t.status !== 'Resolved' && (t.isOverdue || t.priority === 'Urgent' || t.status === 'Open'))
        .sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
          if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
          return parseUtc(b.updated_at).getTime() - parseUtc(a.updated_at).getTime();
        });
    }

    // Recent tickets
    return [...tickets].sort(
      (a, b) => parseUtc(b.updated_at).getTime() - parseUtc(a.updated_at).getTime(),
    );
  }, [tickets, activeTab]);

  // Workload computation by agent
  const agentWorkload = useMemo(() => {
    const activeTickets = tickets.filter((t) => t.status !== 'Resolved');
    const totalActive = activeTickets.length;

    const list = agents.map((agent) => {
      const assigned = activeTickets.filter((t) => t.assignee_id === agent.id);
      const urgentCount = assigned.filter((t) => t.priority === 'Urgent' || t.isOverdue).length;
      const pct = totalActive > 0 ? Math.round((assigned.length / totalActive) * 100) : 0;
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        count: assigned.length,
        urgentCount,
        pct,
      };
    });

    const unassigned = activeTickets.filter((t) => !t.assignee_id);
    const unassignedPct = totalActive > 0 ? Math.round((unassigned.length / totalActive) * 100) : 0;

    return {
      agents: list,
      unassignedCount: unassigned.length,
      unassignedPct,
      totalActive,
    };
  }, [tickets, agents]);

  // Overall resolution rate
  const resolutionRate = useMemo(() => {
    if (!data || !data.total) return 0;
    return Math.round((data.resolved / data.total) * 100);
  }, [data]);

  if (error) {
    return (
      <div className="page">
        <div className="state-message">
          <h2>Failed to load dashboard</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => { refetchDashboard(); refetchTickets(); }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total', value: data?.total, className: '', filter: '' },
    { label: 'Open', value: data?.open, className: '', filter: 'status=Open' },
    { label: 'In Progress', value: data?.inProgress, className: 'stat-card--in-progress', filter: 'status=In+Progress' },
    { label: 'Waiting on Customer', value: data?.waitingOnCustomer, className: 'stat-card--waiting', filter: 'status=Waiting+on+Customer' },
    { label: 'Resolved', value: data?.resolved, className: 'stat-card--resolved', filter: 'status=Resolved' },
    { label: 'Urgent', value: data?.urgent, className: 'stat-card--urgent', filter: 'priority=Urgent' },
    { label: 'Overdue', value: data?.overdue, className: 'stat-card--overdue', filter: 'sort=updated' },
  ];

  return (
    <div className="page">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__top">
          <div>
            <h1 className="dashboard-hero__title">Dashboard</h1>
            <p className="dashboard-hero__subtitle">Real-time overview of your support queue</p>
          </div>

          <div className="dashboard-hero__actions">
            <button
              type="button"
              className="btn-secondary dashboard-action-btn"
              onClick={() => {
                refetchDashboard();
                refetchTickets();
              }}
              title="Refresh queue and stats"
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              className="btn-primary dashboard-action-btn"
              onClick={() => navigate('/tickets/new')}
            >
              + New Ticket
            </button>
          </div>
        </div>

        {/* 7 Interactive Stat Cards */}
        <div className="dashboard-grid">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`stat-card stat-card--clickable ${c.className} ${loadingStats ? 'stat-card--skeleton' : ''}`}
              onClick={() => navigate(c.filter ? `/tickets?${c.filter}` : '/tickets')}
              title={`View ${c.label} tickets`}
            >
              <span className={`stat-card__value ${loadingStats ? 'skeleton' : ''}`}>
                {loadingStats ? '' : c.value}
              </span>
              <span className={`stat-card__label ${loadingStats ? 'skeleton' : ''}`}>
                {loadingStats ? '' : c.label}
              </span>
              <span className="stat-card__hint">View tickets →</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Layout (2-Column Grid) */}
      <div className="dashboard-content-grid">
        {/* Left Column: Priority Attention Queue */}
        <section className="dashboard-panel dashboard-panel--main">
          <div className="dashboard-panel__header">
            <div>
              <h2 className="dashboard-panel__title">Priority Queue</h2>
              <p className="dashboard-panel__subtitle">Immediate actionable tickets in your pipeline</p>
            </div>

            <div className="dashboard-pill-filter">
              <button
                type="button"
                className={`dashboard-pill ${activeTab === 'attention' ? 'active' : ''}`}
                onClick={() => setActiveTab('attention')}
              >
                Needs Attention
              </button>
              <button
                type="button"
                className={`dashboard-pill ${activeTab === 'recent' ? 'active' : ''}`}
                onClick={() => setActiveTab('recent')}
              >
                Recent Updates
              </button>
            </div>
          </div>

          {/* Ticket Queue List */}
          <div className="dashboard-ticket-list">
            {loadingTickets && queueTickets.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="dashboard-ticket-skeleton skeleton" />
              ))
            ) : queueTickets.length === 0 ? (
              <div className="dashboard-empty-queue">
                <p>✓ All clear! No tickets currently require urgent attention.</p>
              </div>
            ) : (
              queueTickets.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className={`dashboard-ticket-item ${t.isOverdue ? 'dashboard-ticket-item--overdue' : ''}`}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <div className="dashboard-ticket-item__left">
                    <div className="dashboard-ticket-item__title-row">
                      {t.isOverdue && <OverdueTag />}
                      <span className="dashboard-ticket-item__subject" title={t.subject}>
                        {t.subject}
                      </span>
                    </div>
                    <div className="dashboard-ticket-item__meta">
                      <span>Customer: <strong>{t.customer}</strong></span>
                      <span>•</span>
                      <span>Updated {relativeTime(parseUtc(t.updated_at))}</span>
                    </div>
                  </div>

                  <div className="dashboard-ticket-item__right">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                    <span className="dashboard-ticket-item__arrow">→</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-panel__footer">
            <button
              type="button"
              className="dashboard-view-all-btn"
              onClick={() => navigate('/tickets')}
            >
              View Full Ticket Queue ({tickets.length}) →
            </button>
          </div>
        </section>

        {/* Right Column: Workload & Status Distribution */}
        <div className="dashboard-side-col">
          {/* Workload by Agent */}
          <section className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <h3 className="dashboard-panel__title">Team Workload</h3>
                <p className="dashboard-panel__subtitle">Active tickets assigned per agent</p>
              </div>
              <span className="dashboard-badge-pill">
                {agentWorkload.totalActive} active
              </span>
            </div>

            <div className="workload-list">
              {agentWorkload.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="workload-item"
                  onClick={() => navigate(`/tickets?assignee=${agent.id}`)}
                  title={`View tickets assigned to ${agent.name}`}
                >
                  <div className="workload-item__info">
                    <div className="workload-item__avatar">
                      {agent.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="workload-item__names">
                      <span className="workload-item__name">{agent.name}</span>
                      <span className="workload-item__role">{agent.role}</span>
                    </div>
                  </div>

                  <div className="workload-item__stat">
                    <span className="workload-item__count">
                      <strong>{agent.count}</strong> tickets
                    </span>
                    {agent.urgentCount > 0 && (
                      <span className="workload-item__urgent-tag">
                        {agent.urgentCount} urgent
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Unassigned row */}
              <div
                className="workload-item workload-item--unassigned"
                onClick={() => navigate('/tickets')}
                title="View unassigned tickets"
              >
                <div className="workload-item__info">
                  <div className="workload-item__avatar workload-item__avatar--unassigned">
                    ?
                  </div>
                  <div className="workload-item__names">
                    <span className="workload-item__name">Unassigned Queue</span>
                    <span className="workload-item__role">Awaiting agent pick</span>
                  </div>
                </div>

                <div className="workload-item__stat">
                  <span className="workload-item__count">
                    <strong>{agentWorkload.unassignedCount}</strong> tickets
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Queue Health & Distribution */}
          <section className="dashboard-panel">
            <div className="dashboard-panel__header">
              <div>
                <h3 className="dashboard-panel__title">Queue Health</h3>
                <p className="dashboard-panel__subtitle">Resolution rate & status distribution</p>
              </div>
              <span className={`dashboard-health-badge ${data && data.overdue > 0 ? 'needs-action' : 'healthy'}`}>
                {data && data.overdue > 0 ? '● Attention Needed' : '● Queue Healthy'}
              </span>
            </div>

            {/* Resolution Rate Box */}
            <div className="health-stat-box">
              <div className="health-stat-box__main">
                <span className="health-stat-box__rate">{resolutionRate}%</span>
                <span className="health-stat-box__label">Overall Resolution Rate</span>
              </div>
              <p className="health-stat-box__detail">
                {data?.resolved ?? 0} resolved of {data?.total ?? 0} total tickets logged
              </p>
            </div>

            {/* Status Breakdown Bar */}
            {data && data.total > 0 && (
              <div className="status-progress-wrap">
                <div className="status-progress-bar">
                  <div
                    className="status-segment status-segment--open"
                    style={{ width: `${(data.open / data.total) * 100}%` }}
                    title={`Open: ${data.open}`}
                  />
                  <div
                    className="status-segment status-segment--in-progress"
                    style={{ width: `${(data.inProgress / data.total) * 100}%` }}
                    title={`In Progress: ${data.inProgress}`}
                  />
                  <div
                    className="status-segment status-segment--waiting"
                    style={{ width: `${(data.waitingOnCustomer / data.total) * 100}%` }}
                    title={`Waiting on Customer: ${data.waitingOnCustomer}`}
                  />
                  <div
                    className="status-segment status-segment--resolved"
                    style={{ width: `${(data.resolved / data.total) * 100}%` }}
                    title={`Resolved: ${data.resolved}`}
                  />
                </div>

                {/* Interactive Status Legend */}
                <div className="status-legend-grid">
                  <div
                    className="status-legend-item"
                    onClick={() => navigate('/tickets?status=Open')}
                  >
                    <span className="status-dot dot--open" />
                    <span className="status-legend-label">Open</span>
                    <strong className="status-legend-value">{data.open}</strong>
                  </div>
                  <div
                    className="status-legend-item"
                    onClick={() => navigate('/tickets?status=In+Progress')}
                  >
                    <span className="status-dot dot--in-progress" />
                    <span className="status-legend-label">In Progress</span>
                    <strong className="status-legend-value">{data.inProgress}</strong>
                  </div>
                  <div
                    className="status-legend-item"
                    onClick={() => navigate('/tickets?status=Waiting+on+Customer')}
                  >
                    <span className="status-dot dot--waiting" />
                    <span className="status-legend-label">Waiting</span>
                    <strong className="status-legend-value">{data.waitingOnCustomer}</strong>
                  </div>
                  <div
                    className="status-legend-item"
                    onClick={() => navigate('/tickets?status=Resolved')}
                  >
                    <span className="status-dot dot--resolved" />
                    <span className="status-legend-label">Resolved</span>
                    <strong className="status-legend-value">{data.resolved}</strong>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
