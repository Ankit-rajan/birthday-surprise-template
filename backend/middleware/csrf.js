import crypto from 'node:crypto';
import { isAllowedOrigin } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects state-changing requests whose Origin header is not our frontend.
 * Applied to every mutating route, including login/unlock (which have no session yet).
 */
export function originCheck(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  return next();
}

/**
 * Synchroniser-token CSRF defence for authenticated sessions. The token is handed to the
 * page at login and must come back in the X-CSRF-Token header. Combined with SameSite
 * cookies and the Origin check above, a third-party site cannot forge a request.
 */
export function csrfProtect(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const sent = Buffer.from(req.get('x-csrf-token') || '');
  const expected = Buffer.from(req.auth?.csrf || '');
  if (!expected.length || sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  return next();
}
