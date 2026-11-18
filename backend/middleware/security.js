import helmet from 'helmet';
import cors from 'cors';
import { isAllowedOrigin } from '../config/env.js';

export function applySecurity(app) {
  app.use(
    helmet({
      // Private media must not be embeddable by other sites. Public media overrides this per-response.
      crossOriginResourcePolicy: { policy: 'same-origin' },
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests (via the Vercel rewrite) carry no CORS requirement; otherwise allow-list only.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );

  // API responses are never cached by default. Media routes set their own headers.
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
}
