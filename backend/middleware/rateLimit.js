import rateLimit from 'express-rate-limit';

const limiter = (options, message) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: message }),
    ...options,
  });

export const apiLimiter = limiter({ windowMs: 60_000, limit: 300 }, 'Too many requests. Please slow down.');

// Only FAILED attempts count (skipSuccessfulRequests), so normal use is never throttled.
export const unlockLimiter = limiter(
  { windowMs: 10 * 60_000, limit: 6, skipSuccessfulRequests: true },
  'Too many attempts. Please wait a few minutes and try again.',
);

export const adminLoginLimiter = limiter(
  { windowMs: 15 * 60_000, limit: 8, skipSuccessfulRequests: true },
  'Too many login attempts. Please wait and try again.',
);

export const uploadLimiter = limiter({ windowMs: 60_000, limit: 40 }, 'Too many uploads. Please slow down.');
