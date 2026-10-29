import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { initDb, getDb, closeDb } from '../src/db/connection';
import { createApp } from '../src/app';
import type { Express } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

let app: Express;
let dbPath: string;

beforeAll(() => {
  // Use a temp file for test DB so tests are isolated
  dbPath = path.join(os.tmpdir(), `support-desk-test-${Date.now()}.db`);
  initDb(dbPath);
  app = createApp();
});

afterAll(() => {
  closeDb();
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
});

beforeEach(() => {
  const db = getDb();
  // Clear tickets (cascades to entries & events)
  db.exec('DELETE FROM tickets');
});

/* ================================================================== */
/*  Validation 400                                                    */
/* ================================================================== */

describe('Validation', () => {
  it('returns 400 with field errors when required fields are missing', async () => {
    const res = await request(app).post('/api/tickets').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeInstanceOf(Array);

    const fields = res.body.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('subject');
    expect(fields).toContain('customer');
    expect(fields).toContain('description');
  });

  it('returns 400 when subject exceeds max length', async () => {
    const res = await request(app).post('/api/tickets').send({
      subject: 'x'.repeat(201),
      customer: 'Test User',
      description: 'A valid description',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.some((d: { field: string }) => d.field === 'subject')).toBe(
      true,
    );
  });

  it('returns 400 for whitespace-only fields', async () => {
    const res = await request(app).post('/api/tickets').send({
      subject: '   ',
      customer: 'User',
      description: 'desc',
    });
    expect(res.status).toBe(400);
  });
});

/* ================================================================== */
/*  Event creation                                                    */
/* ================================================================== */

describe('Event creation', () => {
  it('creates a "created" event when a ticket is created', async () => {
    const createRes = await request(app).post('/api/tickets').send({
      subject: 'Test ticket',
      customer: 'Jane',
      description: 'Need help',
    });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    const eventsRes = await request(app).get(`/api/tickets/${ticketId}/events`);
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.body.length).toBeGreaterThanOrEqual(1);
    expect(eventsRes.body[0].type).toBe('created');
  });

  it('creates a status_changed event when status is updated', async () => {
    const createRes = await request(app).post('/api/tickets').send({
      subject: 'Status test',
      customer: 'Jane',
      description: 'Desc',
    });
    const ticketId = createRes.body.id;

    await request(app)
      .patch(`/api/tickets/${ticketId}?actor=admin`)
      .send({ status: 'In Progress' });

    const eventsRes = await request(app).get(`/api/tickets/${ticketId}/events`);
    const statusEvt = eventsRes.body.find(
      (e: { type: string }) => e.type === 'status_changed',
    );
    expect(statusEvt).toBeDefined();
    expect(statusEvt.from_value).toBe('Open');
    expect(statusEvt.to_value).toBe('In Progress');
    expect(statusEvt.actor).toBe('admin');
  });

  it('creates events for priority and assignee changes', async () => {
    const createRes = await request(app).post('/api/tickets').send({
      subject: 'Multi change',
      customer: 'Jane',
      description: 'Desc',
    });
    const ticketId = createRes.body.id;

    await request(app)
      .patch(`/api/tickets/${ticketId}?actor=admin`)
      .send({ priority: 'Urgent', assignee_id: 1 });

    const eventsRes = await request(app).get(`/api/tickets/${ticketId}/events`);
    const types = eventsRes.body.map((e: { type: string }) => e.type);
    expect(types).toContain('priority_changed');
    expect(types).toContain('assignee_changed');
  });

  it('creates an event when a reply is added', async () => {
    const createRes = await request(app).post('/api/tickets').send({
      subject: 'Reply test',
      customer: 'Jane',
      description: 'Desc',
    });
    const ticketId = createRes.body.id;

    const entryRes = await request(app)
      .post(`/api/tickets/${ticketId}/entries`)
      .send({ type: 'reply', content: 'Hello!', author: 'Agent Bob' });
    expect(entryRes.status).toBe(201);

    const eventsRes = await request(app).get(`/api/tickets/${ticketId}/events`);
    const replyEvt = eventsRes.body.find(
      (e: { type: string }) => e.type === 'reply_added',
    );
    expect(replyEvt).toBeDefined();
    expect(replyEvt.actor).toBe('Agent Bob');
  });
});

/* ================================================================== */
/*  Overdue rule                                                      */
/* ================================================================== */

describe('Overdue rule', () => {
  it('marks a ticket as overdue when created_at is older than 24h and status is not Resolved', async () => {
    const db = getDb();
    // Insert a ticket directly with an old created_at
    db.prepare(
      `INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-25 hours'), datetime('now', '-25 hours'))`,
    ).run('Old ticket', 'OldUser', 'Old desc', 'High', 'Open');

    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(200);
    const oldTicket = res.body.find(
      (t: { subject: string }) => t.subject === 'Old ticket',
    );
    expect(oldTicket).toBeDefined();
    expect(oldTicket.isOverdue).toBe(true);
  });

  it('does NOT mark a fresh ticket as overdue', async () => {
    const createRes = await request(app).post('/api/tickets').send({
      subject: 'Fresh ticket',
      customer: 'NewUser',
      description: 'Just created',
    });
    expect(createRes.status).toBe(201);

    const res = await request(app).get('/api/tickets');
    const freshTicket = res.body.find(
      (t: { subject: string }) => t.subject === 'Fresh ticket',
    );
    expect(freshTicket).toBeDefined();
    expect(freshTicket.isOverdue).toBe(false);
  });
});

/* ================================================================== */
/*  Resolved exclusion (dashboard)                                    */
/* ================================================================== */

describe('Dashboard — resolved exclusion', () => {
  it('excludes resolved tickets from urgent and overdue counts', async () => {
    const db = getDb();

    // Urgent + resolved  →  should NOT count as urgent
    db.prepare(
      `INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-25 hours'), datetime('now'))`,
    ).run('Resolved urgent', 'User', 'desc', 'Urgent', 'Resolved');

    // Urgent + open  →  SHOULD count
    db.prepare(
      `INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    ).run('Open urgent', 'User', 'desc', 'Urgent', 'Open');

    // Old + resolved  →  should NOT count as overdue
    db.prepare(
      `INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-48 hours'), datetime('now'))`,
    ).run('Resolved old', 'User', 'desc', 'Low', 'Resolved');

    // Old + open  →  SHOULD count as overdue
    db.prepare(
      `INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-48 hours'), datetime('now'))`,
    ).run('Open old', 'User', 'desc', 'Low', 'Open');

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);

    expect(res.body.total).toBe(4);
    expect(res.body.resolved).toBe(2);
    expect(res.body.urgent).toBe(1); // only the non-resolved urgent
    expect(res.body.overdue).toBe(1); // only the non-resolved old ticket
  });
});

/* ================================================================== */
/*  404 handling                                                      */
/* ================================================================== */

describe('404 handling', () => {
  it('returns 404 for a non-existent ticket', async () => {
    const res = await request(app).get('/api/tickets/99999');
    expect(res.status).toBe(404);
  });

  it('returns 404 when updating a non-existent ticket', async () => {
    const res = await request(app)
      .patch('/api/tickets/99999')
      .send({ status: 'Resolved' });
    expect(res.status).toBe(404);
  });
});

/* ================================================================== */
/*  Search & filter                                                   */
/* ================================================================== */

describe('Search and filters', () => {
  beforeEach(async () => {
    await request(app).post('/api/tickets').send({
      subject: 'Login issue',
      customer: 'Alice',
      description: 'Cannot login',
      priority: 'High',
    });
    await request(app).post('/api/tickets').send({
      subject: 'Billing question',
      customer: 'Bob',
      description: 'Overcharged',
      priority: 'Low',
    });
  });

  it('searches by subject', async () => {
    const res = await request(app).get('/api/tickets?search=Login');
    expect(res.body.length).toBe(1);
    expect(res.body[0].subject).toBe('Login issue');
  });

  it('searches by customer name', async () => {
    const res = await request(app).get('/api/tickets?search=Bob');
    expect(res.body.length).toBe(1);
    expect(res.body[0].customer).toBe('Bob');
  });

  it('filters by priority', async () => {
    const res = await request(app).get('/api/tickets?priority=High');
    expect(res.body.length).toBe(1);
    expect(res.body[0].priority).toBe('High');
  });

  it('sorts by priority rank', async () => {
    const res = await request(app).get('/api/tickets?sort=priority');
    expect(res.body[0].priority).toBe('High');
    expect(res.body[1].priority).toBe('Low');
  });
});

