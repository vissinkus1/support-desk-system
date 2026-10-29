import { Router, Request, Response } from 'express';
import { getAllAgents, getAgentById } from '../services/agentService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/* GET /api/agents */
router.get('/', (_req: Request, res: Response) => {
  const agents = getAllAgents();
  res.json(agents);
});

/* GET /api/agents/:id */
router.get('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new AppError(400, 'Invalid agent id');

  const agent = getAgentById(id);
  if (!agent) throw new AppError(404, `Agent #${id} not found`);

  res.json(agent);
});

export default router;

