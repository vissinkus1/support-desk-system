import { initDb } from './db/connection';
import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Initialise database (runs schema + seeds)
initDb();

const app = createApp();

app.listen(PORT, () => {
  console.log(`Support Desk API running on http://localhost:${PORT}`);
});

