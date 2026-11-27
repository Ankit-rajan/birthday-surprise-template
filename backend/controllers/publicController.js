import { z } from 'zod';
import { buildSiteContent } from '../services/content.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { SiteContent } from '../models/SiteContent.js';
import { User } from '../models/User.js';
import { streamAsset } from '../services/media.js';
import { hasSiteAccess, pageIsLockable, publicAssetAllowed } from '../services/access.js';
import { checkSitePassword } from '../services/access.js';
import { createSession, destroySession, setSessionCookie, cookieName } from '../services/sessions.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

/** GET /api/birthday/:slug. Only published sites of active owners get here (resolvePublicSite). */
export const getBirthday = asyncHandler(async (req, res) => {
  if (req.slugRedirect) return res.json({ redirectTo: req.site.slug });
  res.set('Cache-Control', 'no-store');
  // A password-protected page sends NOTHING but the lock notice until this browser has unlocked it.
  if (!(await hasSiteAccess(req, req.site))) return res.json({ slug: req.site.slug, locked: true });
  return res.json({ slug: req.site.slug, ...(await buildSiteContent(req.site, 'public')) });
});

const LOCKOUT_AFTER = 20; // consecutive failures across ALL visitors of this one page
const LOCKOUT_MINUTES = 15;

/** POST /api/birthday/:slug/unlock-site */
export const unlockSite = asyncHandler(async (req, res) => {
  if (req.slugRedirect) throw new HttpError(404, 'Not found');
  const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
  const site = await SiteContent.findOne({ owner: req.site.owner }).select('+sitePasswordHash +siteFailedAttempts +siteLockedUntil');
  if (!site || !pageIsLockable(site)) return res.json({ unlocked: true }); // nothing to unlock
  if (site.siteLockedUntil && site.siteLockedUntil > new Date()) {
    throw new HttpError(429, 'This page is resting after too many wrong attempts. Please try again later.');
  }
  if (!(await checkSitePassword(site.owner, password))) {
    site.siteFailedAttempts = (site.siteFailedAttempts || 0) + 1;
    if (site.siteFailedAttempts >= LOCKOUT_AFTER) {
      site.siteLockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
      site.siteFailedAttempts = 0;
    }
    await SiteContent.updateOne({ _id: site._id }, { siteFailedAttempts: site.siteFailedAttempts, siteLockedUntil: site.siteLockedUntil ?? null });
    throw new HttpError(401, 'Incorrect password');
  }
  if (site.siteFailedAttempts || site.siteLockedUntil) {
    await SiteContent.updateOne({ _id: site._id }, { siteFailedAttempts: 0, siteLockedUntil: null });
  }
  await destroySession('site', req.cookies?.[cookieName.site]);
  const { token } = await createSession('site', { role: 'visitor', owner: site.owner, req });
  setSessionCookie(res, 'site', token);
  return res.json({ unlocked: true });
});

/**
 * Serves a PUBLIC asset only while its owner's site is published and the owner is active, the section it belongs to
 * is switched on, and (for a password-protected page) this browser has unlocked the page.
 * Private assets, unpublished sites, disabled sections and deactivated owners all answer with the same 404.
 */
export const getPublicMedia = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(objectId(req.params.id));
  if (!asset || asset.visibility !== 'public') throw new HttpError(404, 'Not found');
  const [site, owner] = await Promise.all([
    SiteContent.findOne({ owner: asset.owner, published: true }),
    User.exists({ _id: asset.owner, status: 'active' }),
  ]);
  if (!site || !owner) throw new HttpError(404, 'Not found');
  if (!(await hasSiteAccess(req, site)) || !(await publicAssetAllowed(site, asset))) throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
});
