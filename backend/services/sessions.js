import crypto from 'node:crypto';
import { Session } from '../models/Session.js';
import { env } from '../config/env.js';

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

const LIMITS = {
  vault: {
    idleMs: (env.vaultIdleSeconds + env.vaultServerGraceSeconds) * 1000,
    maxMs: env.vaultMaxMinutes * 60_000,
  },
  admin: {
    idleMs: env.adminIdleMinutes * 60_000,
    maxMs: env.adminMaxHours * 3_600_000,
  },
};

export const cookieName = { vault: 'vault_sid', admin: 'admin_sid' };
// Cookies are scoped to their own API prefix so the vault cookie is never sent to admin routes and vice versa.
const cookiePath = { vault: '/api/vault', admin: '/api/admin' };

export async function createSession(type, { role, userId = null, req }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  const session = await Session.create({
    tokenHash: hash(token),
    type,
    role,
    userId,
    csrf,
    lastActivity: new Date(now),
    expiresAt: new Date(now + LIMITS[type].maxMs),
    userAgent: (req.get('user-agent') || '').slice(0, 200),
  });
  return { token, session };
}

/** Returns the live session or null. Enforces idle + absolute expiry, and refreshes lastActivity. */
export async function loadSession(type, token) {
  if (!token || typeof token !== 'string') return null;
  const session = await Session.findOne({ tokenHash: hash(token), type });
  if (!session) return null;
  const now = Date.now();
  const idle = now - session.lastActivity.getTime();
  if (session.expiresAt.getTime() <= now || idle > LIMITS[type].idleMs) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }
  if (idle > 5000) {
    session.lastActivity = new Date(now);
    await Session.updateOne({ _id: session._id }, { lastActivity: session.lastActivity });
  }
  return session;
}

export async function destroySession(type, token) {
  if (!token || typeof token !== 'string') return;
  await Session.deleteOne({ tokenHash: hash(token), type });
}

export async function destroyAllSessions(type) {
  await Session.deleteMany({ type });
}

const cookieBase = (type) => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: cookiePath[type],
});

/** Session cookie: no maxAge, so the browser discards it when it closes. */
export function setSessionCookie(res, type, token) {
  res.cookie(cookieName[type], token, cookieBase(type));
}

export function clearSessionCookie(res, type) {
  res.clearCookie(cookieName[type], cookieBase(type));
}
