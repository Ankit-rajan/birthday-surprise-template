import { loadSession, cookieName, destroySession } from '../services/sessions.js';
import { AdminUser } from '../models/AdminUser.js';
import { User } from '../models/User.js';
import { SiteContent } from '../models/SiteContent.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';

/**
 * Platform owner (AdminUser). Completely separate from customers: different collection, different cookie
 * (`admin_sid`, scoped to /api/admin), different session type.
 */
export const adminAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[cookieName.admin];
  const session = await loadSession('admin', token);
  if (!session) return res.status(401).json({ error: 'unauthenticated' });
  // A deleted platform-admin account must lose access immediately.
  if (!(await AdminUser.exists({ _id: session.userId }))) {
    await destroySession('admin', token);
    return res.status(401).json({ error: 'unauthenticated' });
  }
  req.auth = session;
  return next();
});

/**
 * A customer. Loads the account on EVERY request, so deactivating or deleting a customer takes effect at once.
 * `req.user._id` is the ONLY tenant key controllers may use. Never read an owner id from the body, query or URL.
 */
export const userAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[cookieName.user];
  const session = await loadSession('user', token);
  if (!session) return res.status(401).json({ error: 'unauthenticated' });
  const user = await User.findById(session.userId).lean();
  if (!user || user.status !== 'active') {
    await destroySession('user', token);
    return res.status(401).json({ error: user ? 'disabled' : 'unauthenticated' });
  }
  req.auth = session;
  req.user = user;
  return next();
});

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: 'Not allowed for this role' });

/**
 * Resolves /api/birthday/:slug to a PUBLISHED site whose owner is active. Anything else (unknown slug,
 * unpublished page, deactivated owner) is the same 404, so nobody can probe which names exist.
 * A site's previous slugs answer with a redirect hint instead.
 */
export const resolvePublicSite = asyncHandler(async (req, res, next) => {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new HttpError(404, 'Not found');
  let site = await SiteContent.findOne({ slug });
  let redirected = false;
  if (!site) {
    site = await SiteContent.findOne({ previousSlugs: slug });
    redirected = Boolean(site);
  }
  if (!site || !site.published) throw new HttpError(404, 'Not found');
  const ownerOk = await User.exists({ _id: site.owner, status: 'active' });
  if (!ownerOk) throw new HttpError(404, 'Not found');
  req.site = site;
  req.slugRedirect = redirected;
  return next();
});

/**
 * Unlocked-vault session for THIS site only. The session records which owner's vault was unlocked, and it
 * must match the site in the URL, so an unlocked vault on one page grants nothing on any other page.
 */
export const vaultAuth = asyncHandler(async (req, res, next) => {
  if (req.slugRedirect) throw new HttpError(404, 'Not found');
  const token = req.cookies?.[cookieName.vault];
  const session = await loadSession('vault', token);
  if (!session || String(session.owner) !== String(req.site.owner)) {
    return res.status(401).json({ error: 'locked' });
  }
  req.auth = session;
  return next();
});
