import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import './styles/global.css';
import './styles/badges.css';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets" element={<TicketList />} />
        <Route path="/tickets/new" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
