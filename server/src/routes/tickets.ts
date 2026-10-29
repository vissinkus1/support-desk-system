import { Router, Request, Response, NextFunction } from 'express';
import {
  createTicketSchema,
  updateTicketSchema,
  createEntrySchema,
} from '../validators/ticket';
import * as ticketService from '../services/ticketService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/* GET /api/tickets — list with search, filters, sort */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, priority, assignee, sort } = req.query;
    const tickets = ticketService.listTickets({
      search: search as string | undefined,
      status: status as string | undefined,
      priority: priority as string | undefined,
      assignee: assignee as string | undefined,
      sort: sort as 'updated' | 'priority' | undefined,
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

/* GET /api/tickets/:id — single ticket with entries & events */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError(400, 'Invalid ticket id');

    const result = ticketService.getTicketById(id);
    if (!result) throw new AppError(404, `Ticket #${id} not found`);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/* POST /api/tickets — create ticket */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createTicketSchema.parse(req.body);
    const ticket = ticketService.createTicket(input);
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/tickets/:id — update ticket */
router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError(400, 'Invalid ticket id');

    const input = updateTicketSchema.parse(req.body);
    const actor = (req.query.actor as string) || 'system';
    const ticket = ticketService.updateTicket(id, input, actor);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

/* POST /api/tickets/:id/entries — add reply or note */
router.post('/:id/entries', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) throw new AppError(400, 'Invalid ticket id');

    const input = createEntrySchema.parse(req.body);
    const entry = ticketService.addEntry(ticketId, input);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

/* GET /api/tickets/:id/events — ticket audit log */
router.get('/:id/events', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = Number(req.params.id);
    if (isNaN(ticketId)) throw new AppError(400, 'Invalid ticket id');

    const events = ticketService.getTicketEvents(ticketId);
    res.json(events);
  } catch (err) {
    next(err);
  }
});

export default router;

