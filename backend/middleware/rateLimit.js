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
// Keyed by IP + site, so one visitor guessing one vault does not lock them out of another site.
export const unlockLimiter = limiter(
  {
    windowMs: 10 * 60_000,
    limit: 6,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${req.ip}|${req.params.slug || ''}`,
  },
  'Too many attempts. Please wait a few minutes and try again.',
);

export const adminLoginLimiter = limiter(
  { windowMs: 15 * 60_000, limit: 8, skipSuccessfulRequests: true },
  'Too many login attempts. Please wait and try again.',
);

export const uploadLimiter = limiter({ windowMs: 60_000, limit: 40 }, 'Too many uploads. Please slow down.');

export const userLoginLimiter = limiter(
  { windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true },
  'Too many login attempts. Please wait a few minutes and try again.',
);

// Counts every attempt, successful or not: registration should not be a firehose.
export const registerLimiter = limiter({ windowMs: 60 * 60_000, limit: 12 }, 'Too many sign-ups from this network. Please try again later.');

export const passwordResetLimiter = limiter(
  { windowMs: 60 * 60_000, limit: 6 },
  'Too many password reset requests. Please try again later.',
);

// Public pages are cheap but scrapable.
export const publicSiteLimiter = limiter({ windowMs: 60_000, limit: 120 }, 'Too many requests. Please slow down.');

export const slugLimiter = limiter({ windowMs: 60 * 60_000, limit: 20 }, 'You are changing your link too often. Please try again later.');
