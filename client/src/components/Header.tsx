import { NavLink, useLocation } from 'react-router-dom';
import { useAgents, type Agent } from '../hooks/useAgents';
import { useEffect, useState } from 'react';
import '../styles/header.css';

const STORAGE_KEY = 'supportDesk_actingAgent';

export function getActingAgent(): Agent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Header() {
  const location = useLocation();
  const { data: agents } = useAgents();
  const [selected, setSelected] = useState<Agent | null>(getActingAgent);

  // Tickets nav active on /tickets and /tickets/:id, but NOT /tickets/new
  const isTicketsActive =
    location.pathname === '/tickets' ||
    (location.pathname.startsWith('/tickets/') && location.pathname !== '/tickets/new');

  // Default to first agent once loaded
  useEffect(() => {
    if (!selected && agents.length > 0) {
      setSelected(agents[0]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents[0]));
    }
  }, [agents, selected]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const agent = agents.find((a) => a.id === Number(e.target.value)) ?? null;
    setSelected(agent);
    if (agent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agent));
    }
  }

  return (
    <header className="app-header">
      <span className="app-header__brand">Support Desk</span>

      <nav className="app-header__nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
          Dashboard
        </NavLink>
        <NavLink
          to="/tickets"
          className={isTicketsActive ? 'active' : ''}
        >
          Tickets
        </NavLink>
        <NavLink to="/tickets/new" className={({ isActive }) => (isActive ? 'active' : '')}>
          New Ticket
        </NavLink>
      </nav>

      <div className="app-header__right">
        <label htmlFor="acting-agent">Acting as</label>
        <select
          id="acting-agent"
          value={selected?.id ?? ''}
          onChange={handleChange}
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

