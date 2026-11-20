import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AdminUser } from '../models/AdminUser.js';
import { User } from '../models/User.js';
import { SiteContent } from '../models/SiteContent.js';
import { MediaAsset } from '../models/MediaAsset.js';
import {
  createSession,
  loadSession,
  destroySession,
  destroySessionsForUser,
  setSessionCookie,
  clearSessionCookie,
  cookieName,
} from '../services/sessions.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

const FAKE_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps login timing uniform for unknown emails
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

/* ------------------------------------------------ platform-owner auth */

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await AdminUser.findOne({ email });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(429, 'Too many failed attempts. Try again later.');
  }
  const ok = await bcrypt.compare(password, user?.passwordHash || FAKE_HASH);
  if (!user || !ok) {
    if (user) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 10) {
        user.lockedUntil = new Date(Date.now() + 15 * 60_000);
        user.failedAttempts = 0;
      }
      await user.save();
    }
    throw new HttpError(401, 'Invalid email or password');
  }
  user.failedAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  await destroySession('admin', req.cookies?.[cookieName.admin]);
  const { token, session } = await createSession('admin', { role: 'admin', userId: user._id, req });
  setSessionCookie(res, 'admin', token);
  res.json({ authenticated: true, email: user.email, role: 'admin', csrfToken: session.csrf });
});

export const logout = asyncHandler(async (req, res) => {
  await destroySession('admin', req.cookies?.[cookieName.admin]);
  clearSessionCookie(res, 'admin');
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const session = await loadSession('admin', req.cookies?.[cookieName.admin]);
  if (!session) return res.json({ authenticated: false });
  const user = await AdminUser.findById(session.userId);
  if (!user) return res.json({ authenticated: false });
  return res.json({ authenticated: true, email: user.email, role: session.role, csrfToken: session.csrf });
});

/* ------------------------------------------------------- user management */
/*
 * Everything below returns ACCOUNT metadata only: name, email, status, dates, link name, published flag and
 * storage totals. The platform owner can never read a customer's letters, photos, vault or messages here.
 */

const DAY = 86_400_000;

export const stats = asyncHandler(async (req, res) => {
  const since7 = new Date(Date.now() - 7 * DAY);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [totalUsers, activeUsers, disabledUsers, new7, new30, publishedSites, storage] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'disabled' }),
    User.countDocuments({ createdAt: { $gte: since7 } }),
    User.countDocuments({ createdAt: { $gte: since30 } }),
    SiteContent.countDocuments({ published: true }),
    MediaAsset.aggregate([{ $group: { _id: null, files: { $sum: 1 }, bytes: { $sum: { $add: ['$size', '$thumbSize'] } } } }]),
  ]);
  res.json({
    totalUsers,
    activeUsers,
    disabledUsers,
    newUsersLast7Days: new7,
    newUsersLast30Days: new30,
    publishedSites,
    unpublishedSites: Math.max(0, totalUsers - publishedSites),
    storedFiles: storage[0]?.files || 0,
    storedBytes: storage[0]?.bytes || 0,
  });
});

const listSchema = z.object({
  search: z.string().trim().max(80).optional().default(''),
  status: z.enum(['active', 'disabled', '']).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listUsers = asyncHandler(async (req, res) => {
  const { search, status, page, limit } = listSchema.parse(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const sites = await SiteContent.find({ owner: { $in: users.map((u) => u._id) } }, { owner: 1, slug: 1, published: 1 }).lean();
  const siteByOwner = new Map(sites.map((s) => [String(s.owner), s]));
  res.json({
    total,
    page,
    limit,
    users: users.map((u) => {
      const site = siteByOwner.get(String(u._id));
      return {
        id: String(u._id),
        name: u.name,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        slug: site?.slug || null,
        published: Boolean(site?.published),
      };
    }),
  });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body);
  const user = await User.findByIdAndUpdate(objectId(req.params.id), { status }, { new: true }).lean();
  if (!user) throw new HttpError(404, 'Not found');
  // Deactivation signs the customer out everywhere immediately (userAuth also re-checks status on every request).
  if (status === 'disabled') await destroySessionsForUser('user', user._id);
  res.json({ user: { id: String(user._id), name: user.name, email: user.email, status: user.status } });
});
