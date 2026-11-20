import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { ensureIndexes } from './services/indexes.js';

await connectDB();
await ensureIndexes();

const server = createApp().listen(env.port, () => {
  console.log(`API listening on :${env.port} (${env.isProd ? 'production' : 'development'})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
