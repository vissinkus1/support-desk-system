import express from 'express';
import agentRoutes from './routes/agents';
import ticketRoutes from './routes/tickets';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());

  // Routes
  app.use('/api/agents', agentRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Health-check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
}

