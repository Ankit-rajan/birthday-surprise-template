import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { applySecurity } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { ensureDefaults } from './services/content.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', env.trustProxy);
app.disable('x-powered-by');

applySecurity(app);
app.use(cookieParser());
app.use(express.json({ limit: '200kb' }));

app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

await connectDB();
await ensureDefaults();

const server = app.listen(env.port, () => {
  console.log(`API listening on :${env.port} (${env.isProd ? 'production' : 'development'})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
