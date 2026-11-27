import bcrypt from 'bcryptjs';
import { SiteContent } from '../models/SiteContent.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { loadSession, cookieName } from './sessions.js';
import { siteFeatures } from './siteState.js';

/** True while the page asks for its password: the switch is ON and a password has been set. */
export const pageIsLockable = (site) => Boolean(site.sitePasswordSet) && siteFeatures(site).passwordProtection;

/** Has this browser unlocked THIS page? (A site session records which owner it belongs to.) */
export async function hasSiteAccess(req, site) {
  if (!pageIsLockable(site)) return true;
  const session = await loadSession('site', req.cookies?.[cookieName.site]);
  return Boolean(session && String(session.owner) === String(site.owner));
}

export const checkSitePassword = async (ownerId, password) => {
  const doc = await SiteContent.findOne({ owner: ownerId }).select('+sitePasswordHash');
  return doc?.sitePasswordHash ? bcrypt.compare(password, doc.sitePasswordHash) : false;
};

/**
 * May this PUBLIC asset be served right now? Every public file belongs to exactly one section of the page; when that
 * section's switch is off (or a parent is off) the file answers 404, so a disabled feature cannot be reached by URL.
 * A file no section refers to is not blocked (nothing to gate).
 */
export async function publicAssetAllowed(site, asset) {
  const f = siteFeatures(site);
  const id = asset._id;
  const p = site.photos || {};
  const is = (v) => v && String(v) === String(id);
  if (is(p.intro)) return f.envelope;
  if (is(p.hero)) return f.hero;
  if (is(p.final)) return f.closing;
  if (is(site.music?.asset)) return f.music;
  if (await GalleryMemory.exists({ owner: site.owner, asset: id })) return asset.kind === 'video' ? f.videoGallery : f.gallery;
  if (await TimelineEntry.exists({ owner: site.owner, asset: id })) return f.timeline;
  return true;
}
