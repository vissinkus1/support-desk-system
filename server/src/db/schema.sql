-- Support Desk System Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agents (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role  TEXT NOT NULL DEFAULT 'agent'
);

CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject     TEXT    NOT NULL,
  customer    TEXT    NOT NULL,
  description TEXT    NOT NULL,
  priority    TEXT    NOT NULL DEFAULT 'Medium'
                      CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status      TEXT    NOT NULL DEFAULT 'Open'
                      CHECK (status IN ('Open', 'In Progress', 'Waiting on Customer', 'Resolved')),
  assignee_id INTEGER NULL REFERENCES agents(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type      TEXT    NOT NULL CHECK (type IN ('reply', 'note')),
  content   TEXT    NOT NULL,
  author    TEXT    NOT NULL,
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  from_value TEXT,
  to_value   TEXT,
  actor      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

