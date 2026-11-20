import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable: ${name}`);
  return devFallback;
}

function parseTrustProxy(raw) {
  if (/^\d+$/.test(raw)) return Number(raw);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function loadJournalKey() {
  const raw = process.env.JOURNAL_ENCRYPTION_KEY;
  if (raw) {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('JOURNAL_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
    }
    return key;
  }
  if (isProd) throw new Error('JOURNAL_ENCRYPTION_KEY is required in production');
  console.warn('[dev] JOURNAL_ENCRYPTION_KEY not set - using an insecure development key.');
  return crypto.createHash('sha256').update('dev-only-journal-key').digest();
}

const sameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
if (!['strict', 'lax', 'none'].includes(sameSite)) {
  throw new Error('COOKIE_SAMESITE must be strict, lax or none');
}
const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd;
if (sameSite === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAMESITE=none requires secure cookies (COOKIE_SECURE=true)');
}

/** In development, accept the dev server on localhost or 127.0.0.1 at any port (people often open either). */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
export const isAllowedOrigin = (origin) =>
  env.frontendOrigins.includes(origin) || (!isProd && LOCAL_ORIGIN.test(origin));

export const env = {
  isProd,
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/birthday-surprise'),
  frontendOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY ?? (isProd ? '2' : '0')),
  cookieSameSite: sameSite,
  cookieSecure,
  // The browser locks itself after vaultIdleSeconds of inactivity.
  // The server allows a small grace period so the two never disagree mid-click.
  vaultIdleSeconds: Number(process.env.VAULT_IDLE_SECONDS || 180),
  vaultServerGraceSeconds: 45,
  vaultMaxMinutes: Number(process.env.VAULT_MAX_MINUTES || 60),
  adminIdleMinutes: Number(process.env.ADMIN_IDLE_MINUTES || 30),
  adminMaxHours: Number(process.env.ADMIN_MAX_HOURS || 8),
  // Customer sessions: sliding idle window + absolute cap. "Remember me" keeps the cookie for the absolute cap.
  userIdleDays: Number(process.env.USER_IDLE_DAYS || 14),
  userMaxDays: Number(process.env.USER_MAX_DAYS || 30),
  registrationOpen: (process.env.REGISTRATION_OPEN ?? 'true') !== 'false',
  // Per-account upload quota (public + private media together). Atlas free tier is only 512 MB in total.
  maxUserStorageMb: Number(process.env.MAX_USER_STORAGE_MB || 100),
  // Used to build password-reset links. Defaults to the first FRONTEND_URL.
  appUrl: (process.env.APP_URL || (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, ''),
  // Optional. Without SMTP_URL the reset link is only logged in development and never in production.
  smtpUrl: process.env.SMTP_URL || '',
  mailFrom: process.env.MAIL_FROM || 'Birthday Surprise <no-reply@example.com>',
  journalKey: loadJournalKey(),
};
