import crypto from 'node:crypto';
import { Session } from '../models/Session.js';
import { env } from '../config/env.js';

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const DAY = 86_400_000;

const LIMITS = {
  vault: {
    idleMs: (env.vaultIdleSeconds + env.vaultServerGraceSeconds) * 1000,
    maxMs: env.vaultMaxMinutes * 60_000,
  },
  admin: {
    idleMs: env.adminIdleMinutes * 60_000,
    maxMs: env.adminMaxHours * 3_600_000,
  },
  user: {
    idleMs: env.userIdleDays * DAY,
    maxMs: env.userMaxDays * DAY,
  },
};

export const cookieName = { vault: 'vault_sid', admin: 'admin_sid', user: 'user_sid' };
// Each cookie is scoped to its own API prefix, so a customer cookie is never sent to platform-admin routes,
// the platform-admin cookie is never sent to customer routes, and neither reaches the public vault routes.
const cookiePath = { vault: '/api/birthday', admin: '/api/admin', user: '/api/app' };

export async function createSession(type, { role, userId = null, owner = null, req }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  const session = await Session.create({
    tokenHash: hash(token),
    type,
    role,
    userId,
    owner,
    csrf,
    lastActivity: new Date(now),
    expiresAt: new Date(now + LIMITS[type].maxMs),
    userAgent: (req.get('user-agent') || '').slice(0, 200),
  });
  return { token, session };
}

/** Returns the live session or null. Enforces idle + absolute expiry, and refreshes lastActivity. */
export async function loadSession(type, token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
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

/** Every session of one customer or platform admin (password change, deactivation, account deletion). */
export async function destroySessionsForUser(type, userId) {
  await Session.deleteMany({ type, userId });
}

/** Every vault session of ONE site. Another customer's visitors are never affected. */
export async function destroyVaultSessionsForOwner(owner) {
  await Session.deleteMany({ type: 'vault', owner });
}

const cookieBase = (type) => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: cookiePath[type],
});

/**
 * Session cookie. By default there is no maxAge, so the browser discards it when it closes.
 * Customers who tick "keep me signed in" get a cookie that lives as long as the session itself.
 */
export function setSessionCookie(res, type, token, { persistent = false } = {}) {
  const options = cookieBase(type);
  if (persistent) options.maxAge = LIMITS[type].maxMs;
  res.cookie(cookieName[type], token, options);
}

export function clearSessionCookie(res, type) {
  res.clearCookie(cookieName[type], cookieBase(type));
}
