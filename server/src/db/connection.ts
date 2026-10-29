import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialised. Call initDb() first.');
  }
  return db;
}

export function initDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? path.join(__dirname, '..', '..', 'data', 'support-desk.db');

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  db = new Database(resolvedPath);

  // Enable WAL mode for better concurrency and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema (resolves in both tsx dev and compiled dist)
  const schemaPath = fs.existsSync(path.join(__dirname, 'schema.sql'))
    ? path.join(__dirname, 'schema.sql')
    : path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Seed demo agents (ignore if already exist)
  const seed = db.prepare(`INSERT OR IGNORE INTO agents (name, email, role) VALUES (?, ?, ?)`);
  const seedMany = db.transaction(() => {
    seed.run('Alice Johnson', 'alice@support.dev', 'admin');
    seed.run('Bob Smith', 'bob@support.dev', 'agent');
    seed.run('Carol Williams', 'carol@support.dev', 'agent');
  });
  seedMany();

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    // @ts-expect-error reset for re-init in tests
    db = undefined;
  }
}

