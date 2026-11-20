import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { applySecurity } from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { notFound, errorHandler } from './middleware/errors.js';
import routes from './routes/index.js';

/** Builds the Express app. Kept separate from server.js so tests can start it on any port. */
export function createApp() {
  const app = express();

  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  applySecurity(app);
  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));
  app.use(sanitizeInput);

  app.use('/api', apiLimiter, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
