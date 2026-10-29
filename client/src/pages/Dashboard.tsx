import { useDashboard } from '../hooks/useDashboard';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();

  if (error) {
    return (
      <div className="page">
        <div className="state-message">
          <h2>Failed to load dashboard</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={refetch}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total', value: data?.total, className: '' },
    { label: 'Open', value: data?.open, className: '' },
    { label: 'In Progress', value: data?.inProgress, className: 'stat-card--in-progress' },
    { label: 'Waiting on Customer', value: data?.waitingOnCustomer, className: 'stat-card--waiting' },
    { label: 'Resolved', value: data?.resolved, className: 'stat-card--resolved' },
    { label: 'Urgent', value: data?.urgent, className: 'stat-card--urgent' },
    { label: 'Overdue', value: data?.overdue, className: 'stat-card--overdue' },
  ];

  return (
    <div className="page">
      <div className="dashboard-hero">
        <h1 className="dashboard-hero__title">Dashboard</h1>
        <p className="dashboard-hero__subtitle">Real-time overview of your support queue</p>

        <div className="dashboard-grid">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`stat-card ${c.className} ${loading ? 'stat-card--skeleton' : ''}`}
            >
              <span className={`stat-card__value ${loading ? 'skeleton' : ''}`}>
                {loading ? '' : c.value}
              </span>
              <span className={`stat-card__label ${loading ? 'skeleton' : ''}`}>
                {loading ? '' : c.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

