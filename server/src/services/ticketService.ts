import { getDb } from '../db/connection';
import { AppError } from '../middleware/errorHandler';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  CreateEntryInput,
} from '../validators/ticket';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Ticket {
  id: number;
  subject: string;
  customer: string;
  description: string;
  priority: string;
  status: string;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  isOverdue: boolean;
}

export interface TicketEntry {
  id: number;
  ticket_id: number;
  type: string;
  content: string;
  author: string;
  created_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  type: string;
  from_value: string | null;
  to_value: string | null;
  actor: string;
  created_at: string;
}

export interface ListTicketsQuery {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  sort?: 'updated' | 'priority';
}

/* ------------------------------------------------------------------ */
/*  Overdue SQL fragment                                              */
/* ------------------------------------------------------------------ */

const OVERDUE_EXPR = `(status != 'Resolved' AND created_at <= datetime('now', '-24 hours'))`;

/* ------------------------------------------------------------------ */
/*  List tickets with search, filter, sort, isOverdue                 */
/* ------------------------------------------------------------------ */

export function listTickets(query: ListTicketsQuery): Ticket[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  // Full-text-ish search on subject OR customer
  if (query.search) {
    conditions.push(`(subject LIKE ? OR customer LIKE ?)`);
    const term = `%${query.search}%`;
    params.push(term, term);
  }

  // Exact filters
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  }
  if (query.priority) {
    conditions.push('priority = ?');
    params.push(query.priority);
  }
  if (query.assignee) {
    conditions.push('assignee_id = ?');
    params.push(Number(query.assignee));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy: string;
  if (query.sort === 'priority') {
    orderBy = `ORDER BY CASE priority
      WHEN 'Urgent' THEN 1
      WHEN 'High'   THEN 2
      WHEN 'Medium' THEN 3
      WHEN 'Low'    THEN 4
    END ASC, updated_at DESC`;
  } else {
    // default: sort by updated_at desc
    orderBy = 'ORDER BY updated_at DESC';
  }

  const sql = `
    SELECT *, (${OVERDUE_EXPR}) AS isOverdue
    FROM tickets
    ${where}
    ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as (Omit<Ticket, 'isOverdue'> & {
    isOverdue: number;
  })[];

  return rows.map((r) => ({ ...r, isOverdue: !!r.isOverdue }));
}

/* ------------------------------------------------------------------ */
/*  Get single ticket (with entries & events)                         */
/* ------------------------------------------------------------------ */

export function getTicketById(
  id: number,
): { ticket: Ticket; entries: TicketEntry[]; events: TicketEvent[] } | null {
  const db = getDb();

  const row = db
    .prepare(`SELECT *, (${OVERDUE_EXPR}) AS isOverdue FROM tickets WHERE id = ?`)
    .get(id) as (Omit<Ticket, 'isOverdue'> & { isOverdue: number }) | undefined;

  if (!row) return null;

  const ticket: Ticket = { ...row, isOverdue: !!row.isOverdue };

  const entries = db
    .prepare('SELECT * FROM ticket_entries WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id) as TicketEntry[];

  const events = db
    .prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(id) as TicketEvent[];

  return { ticket, entries, events };
}

/* ------------------------------------------------------------------ */
/*  Create ticket                                                     */
/* ------------------------------------------------------------------ */

export function createTicket(input: CreateTicketInput): Ticket {
  const db = getDb();

  // Validate assignee exists if provided
  if (input.assignee_id) {
    const agent = db
      .prepare('SELECT id FROM agents WHERE id = ?')
      .get(input.assignee_id);
    if (!agent) {
      throw new AppError(400, `Agent with id ${input.assignee_id} not found`);
    }
  }

  const result = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO tickets (subject, customer, description, priority, assignee_id)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.subject,
        input.customer,
        input.description,
        input.priority,
        input.assignee_id ?? null,
      );

    const ticketId = info.lastInsertRowid as number;

    // Event: ticket created
    db.prepare(
      `INSERT INTO ticket_events (ticket_id, type, from_value, to_value, actor)
       VALUES (?, 'created', NULL, 'Open', ?)`,
    ).run(ticketId, input.customer);

    // Event: assigned if assignee provided
    if (input.assignee_id) {
      db.prepare(
        `INSERT INTO ticket_events (ticket_id, type, from_value, to_value, actor)
         VALUES (?, 'assignee_changed', NULL, ?, ?)`,
      ).run(ticketId, String(input.assignee_id), input.customer);
    }

    return ticketId;
  })();

  const created = getTicketById(result as number)!;
  return created.ticket;
}

/* ------------------------------------------------------------------ */
/*  Update ticket (status/priority/assignee changes produce events)   */
/* ------------------------------------------------------------------ */

export function updateTicket(
  id: number,
  input: UpdateTicketInput,
  actor: string = 'system',
): Ticket {
  const db = getDb();

  const existing = db
    .prepare('SELECT * FROM tickets WHERE id = ?')
    .get(id) as Omit<Ticket, 'isOverdue'> | undefined;

  if (!existing) {
    throw new AppError(404, `Ticket #${id} not found`);
  }

  // Validate assignee if provided
  if (input.assignee_id !== undefined && input.assignee_id !== null) {
    const agent = db
      .prepare('SELECT id FROM agents WHERE id = ?')
      .get(input.assignee_id);
    if (!agent) {
      throw new AppError(400, `Agent with id ${input.assignee_id} not found`);
    }
  }

  db.transaction(() => {
    // Track which fields changed to emit events
    const eventFields: { type: string; from: string | null; to: string | null }[] = [];

    if (input.status !== undefined && input.status !== existing.status) {
      eventFields.push({
        type: 'status_changed',
        from: existing.status,
        to: input.status,
      });
    }
    if (input.priority !== undefined && input.priority !== existing.priority) {
      eventFields.push({
        type: 'priority_changed',
        from: existing.priority,
        to: input.priority,
      });
    }
    if (input.assignee_id !== undefined) {
      const oldAssignee = existing.assignee_id
        ? String(existing.assignee_id)
        : null;
      const newAssignee = input.assignee_id
        ? String(input.assignee_id)
        : null;
      if (oldAssignee !== newAssignee) {
        eventFields.push({
          type: 'assignee_changed',
          from: oldAssignee,
          to: newAssignee,
        });
      }
    }

    // Build dynamic UPDATE
    const sets: string[] = ['updated_at = datetime(\'now\')'];
    const vals: unknown[] = [];

    for (const key of [
      'subject',
      'customer',
      'description',
      'priority',
      'status',
    ] as const) {
      if (input[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(input[key]);
      }
    }
    if (input.assignee_id !== undefined) {
      sets.push('assignee_id = ?');
      vals.push(input.assignee_id);
    }

    vals.push(id);
    db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(
      ...vals,
    );

    // Write events
    const insertEvent = db.prepare(
      `INSERT INTO ticket_events (ticket_id, type, from_value, to_value, actor)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const evt of eventFields) {
      insertEvent.run(id, evt.type, evt.from, evt.to, actor);
    }
  })();

  return getTicketById(id)!.ticket;
}

/* ------------------------------------------------------------------ */
/*  Add entry (reply / note) + event                                  */
/* ------------------------------------------------------------------ */

export function addEntry(ticketId: number, input: CreateEntryInput): TicketEntry {
  const db = getDb();

  const ticket = db
    .prepare('SELECT id FROM tickets WHERE id = ?')
    .get(ticketId);
  if (!ticket) {
    throw new AppError(404, `Ticket #${ticketId} not found`);
  }

  const entryId = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO ticket_entries (ticket_id, type, content, author)
         VALUES (?, ?, ?, ?)`,
      )
      .run(ticketId, input.type, input.content, input.author);

    // Touch updated_at
    db.prepare(`UPDATE tickets SET updated_at = datetime('now') WHERE id = ?`).run(
      ticketId,
    );

    // Event for the entry
    db.prepare(
      `INSERT INTO ticket_events (ticket_id, type, from_value, to_value, actor)
       VALUES (?, ?, NULL, ?, ?)`,
    ).run(ticketId, `${input.type}_added`, input.content.slice(0, 100), input.author);

    return info.lastInsertRowid as number;
  })();

  return db
    .prepare('SELECT * FROM ticket_entries WHERE id = ?')
    .get(entryId) as TicketEntry;
}

/* ------------------------------------------------------------------ */
/*  Get events for a ticket                                           */
/* ------------------------------------------------------------------ */

export function getTicketEvents(ticketId: number): TicketEvent[] {
  const db = getDb();

  const ticket = db
    .prepare('SELECT id FROM tickets WHERE id = ?')
    .get(ticketId);
  if (!ticket) {
    throw new AppError(404, `Ticket #${ticketId} not found`);
  }

  return db
    .prepare('SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC')
    .all(ticketId) as TicketEvent[];
}

