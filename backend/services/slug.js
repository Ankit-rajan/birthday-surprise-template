import crypto from 'node:crypto';
import { SiteContent } from '../models/SiteContent.js';

/** Paths that must never be claimable as /birthday/<slug>, and that would be confusing even if they were. */
export const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'birthday', 'billing', 'contact', 'dashboard', 'demo', 'faq',
  'features', 'forgot-password', 'help', 'home', 'how-it-works', 'login', 'logout', 'me', 'null', 'platform',
  'preview', 'privacy', 'register', 'reset-password', 'root', 'settings', 'signup', 'sign-in', 'sign-up',
  'staff', 'support', 'system', 'terms', 'test', 'undefined', 'www',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-)){1,38}[a-z0-9]$/; // 3-40 chars, lowercase, digits, single hyphens

/** Returns an error message or null. */
export function validateSlug(slug) {
  if (typeof slug !== 'string') return 'Please enter a link name.';
  if (slug.length < 3 || slug.length > 40) return 'Your link name must be between 3 and 40 characters.';
  if (!SLUG_RE.test(slug)) return 'Use only lowercase letters, numbers and single hyphens, and start and end with a letter or number.';
  if (RESERVED_SLUGS.has(slug)) return 'That link name is reserved. Please choose another.';
  return null;
}

export function slugify(input) {
  const base = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
  return base.length >= 3 ? base : `surprise${base}`;
}

/** True when nobody else owns (or has previously owned) the slug. The owner may keep or re-take their own. */
export async function isSlugAvailable(slug, ownerId = null) {
  if (validateSlug(slug)) return false;
  const clash = await SiteContent.findOne({ $or: [{ slug }, { previousSlugs: slug }] }, { owner: 1 }).lean();
  return !clash || (ownerId && String(clash.owner) === String(ownerId));
}

/** Generates an available slug from a display name, adding a short random suffix on collisions. */
export async function generateSlug(name) {
  const base = slugify(name);
  if (await isSlugAvailable(base)) return base;
  for (let i = 0; i < 8; i += 1) {
    const candidate = `${base.slice(0, 33)}-${crypto.randomInt(100, 9999)}`;
    // eslint-disable-next-line no-await-in-loop
    if (await isSlugAvailable(candidate)) return candidate;
  }
  return `${base.slice(0, 25)}-${crypto.randomBytes(4).toString('hex')}`;
}
