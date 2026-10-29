import { Router, Request, Response, NextFunction } from 'express';
import { getDashboardStats } from '../services/dashboardService';

const router = Router();

/* GET /api/dashboard */
router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;

