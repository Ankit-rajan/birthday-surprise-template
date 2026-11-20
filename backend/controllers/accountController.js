import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { SiteContent } from '../models/SiteContent.js';
import {
  createSession,
  loadSession,
  destroySession,
  destroySessionsForUser,
  setSessionCookie,
  clearSessionCookie,
  cookieName,
} from '../services/sessions.js';
import { provisionWorkspace, deleteAccountAndData } from '../services/workspace.js';
import { sendPasswordReset } from '../services/mailer.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { validateUserPassword } from '../utils/passwordPolicy.js';

const BCRYPT_COST = 12;
const FAKE_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST); // uniform timing for unknown emails
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

const nameField = z.string().trim().min(1, 'Please enter your name').max(80);
const emailField = z.string().trim().toLowerCase().email('Please enter a valid email address').max(254);

const registerSchema = z.object({ name: nameField, email: emailField, password: z.string().max(200) });
const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(200), remember: z.boolean().optional() });

/** The only shape of a user that ever leaves the server. Never includes hashes, tokens or lockout counters. */
export const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, createdAt: u.createdAt });

async function startSession(req, res, user, { remember = false } = {}) {
  await destroySession('user', req.cookies?.[cookieName.user]); // never reuse a pre-login session id
  const { token, session } = await createSession('user', { role: 'user', userId: user._id, req });
  setSessionCookie(res, 'user', token, { persistent: remember });
  return session;
}

const siteSummary = async (userId) => {
  const site = await SiteContent.findOne({ owner: userId }, { slug: 1, published: 1 }).lean();
  return site ? { slug: site.slug, published: site.published } : null;
};

/* ------------------------------------------------------------ register */

export const register = asyncHandler(async (req, res) => {
  if (!env.registrationOpen) throw new HttpError(403, 'Sign-ups are closed right now.');
  const { name, email, password } = registerSchema.parse(req.body);
  const problem = validateUserPassword(password, { email, name });
  if (problem) throw new HttpError(400, problem);

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  let user;
  try {
    user = await User.create({ name, email, passwordHash, lastLoginAt: new Date() });
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this email already exists. Try logging in instead.');
    throw err;
  }
  try {
    await provisionWorkspace(user);
  } catch (err) {
    await deleteAccountAndData(user._id).catch(() => {}); // never leave a half-created account behind
    throw err;
  }
  const session = await startSession(req, res, user, { remember: true });
  res.status(201).json({ user: publicUser(user), site: await siteSummary(user._id), csrfToken: session.csrf });
});

/* --------------------------------------------------------------- login */

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash +failedAttempts +lockedUntil');

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(429, 'Too many failed attempts. Please try again in a few minutes.');
  }
  const ok = await bcrypt.compare(password, user?.passwordHash || FAKE_HASH);
  if (!user || !ok) {
    if (user) {
      const failedAttempts = user.failedAttempts + 1;
      const lock = failedAttempts >= 10;
      await User.updateOne(
        { _id: user._id },
        { failedAttempts: lock ? 0 : failedAttempts, lockedUntil: lock ? new Date(Date.now() + 15 * 60_000) : null },
      );
    }
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.status !== 'active') throw new HttpError(403, 'This account has been deactivated. Please contact support.');

  await User.updateOne({ _id: user._id }, { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() });
  const session = await startSession(req, res, user, { remember: Boolean(remember) });
  res.json({ user: publicUser(user), site: await siteSummary(user._id), csrfToken: session.csrf });
});

export const logout = asyncHandler(async (req, res) => {
  await destroySession('user', req.cookies?.[cookieName.user]);
  clearSessionCookie(res, 'user');
  res.json({ ok: true });
});

/** Never 401s, so the page can ask "am I logged in?" without console noise. */
export const me = asyncHandler(async (req, res) => {
  const session = await loadSession('user', req.cookies?.[cookieName.user]);
  if (!session) return res.json({ authenticated: false });
  const user = await User.findById(session.userId).lean();
  if (!user || user.status !== 'active') return res.json({ authenticated: false });
  return res.json({ authenticated: true, user: publicUser(user), site: await siteSummary(user._id), csrfToken: session.csrf });
});

/* ------------------------------------------------------ password reset */

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: emailField }).parse(req.body);
  const user = await User.findOne({ email });
  if (user && user.status === 'active') {
    const token = crypto.randomBytes(32).toString('base64url');
    await User.updateOne(
      { _id: user._id },
      { resetTokenHash: sha256(token), resetExpiresAt: new Date(Date.now() + 60 * 60_000) },
    );
    try {
      await sendPasswordReset(user.email, user.name, `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error('Could not send password reset email:', err.message);
    }
  }
  // Same answer whether or not the account exists.
  res.json({ ok: true, message: 'If an account exists for that email, a reset link is on its way.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) }).parse(req.body);
  const user = await User.findOne({ resetTokenHash: sha256(token), resetExpiresAt: { $gt: new Date() } }).select(
    '+resetTokenHash +resetExpiresAt',
  );
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Please request a new one.');
  const problem = validateUserPassword(password, { email: user.email, name: user.name });
  if (problem) throw new HttpError(400, problem);

  await User.updateOne(
    { _id: user._id },
    {
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      resetTokenHash: null,
      resetExpiresAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    },
  );
  await destroySessionsForUser('user', user._id); // everyone signed in with the old password is signed out
  res.json({ ok: true, message: 'Your password has been changed. You can log in now.' });
});

/* ------------------------------------------------------------- account */

export const updateAccount = asyncHandler(async (req, res) => {
  const { name } = z.object({ name: nameField }).parse(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true }).lean();
  res.json({ user: publicUser(user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().max(200) })
    .parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new HttpError(403, 'Your current password was not correct.');
  const problem = validateUserPassword(newPassword, { email: user.email, name: user.name });
  if (problem) throw new HttpError(400, problem);
  await User.updateOne({ _id: user._id }, { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST) });
  await destroySessionsForUser('user', user._id);
  const session = await startSession(req, res, user, { remember: true });
  res.json({ ok: true, csrfToken: session.csrf });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(403, 'Your password was not correct.');
  await deleteAccountAndData(user._id);
  clearSessionCookie(res, 'user');
  res.json({ ok: true });
});
