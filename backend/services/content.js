import { SiteContent } from '../models/SiteContent.js';
import { Letter } from '../models/Letter.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { PLACEHOLDER_PREFIX } from './defaults.js';

/**
 * Media URLs differ by audience:
 *   public -> /api/media/:id       works for everyone, but only while the owner's site is published
 *   app    -> /api/app/media/:id   works only for the logged-in owner (dashboard + preview of unpublished sites)
 */
export const mediaUrl = (id, { thumb = false, scope = 'public' } = {}) => {
  if (!id) return null;
  const base = scope === 'app' ? '/api/app/media' : '/api/media';
  return `${base}/${id}${thumb ? '?thumb=1' : ''}`;
};

const byDateThenCreated = (a, b) => {
  const da = a.date ? a.date.getTime() : Infinity;
  const db = b.date ? b.date.getTime() : Infinity;
  return da - db || a.createdAt - b.createdAt;
};

export const SITE_SETTINGS_DEFAULTS = {
  cake: { theme: 'rose', candles: 5, showAge: true },
  effects: { petals: true, confetti: true, celebrationSounds: true },
};

export const serializeSettings = (site) => ({
  cake: { ...SITE_SETTINGS_DEFAULTS.cake, ...(site.settings?.cake?.toObject?.() ?? site.settings?.cake ?? {}) },
  effects: { ...SITE_SETTINGS_DEFAULTS.effects, ...(site.settings?.effects?.toObject?.() ?? site.settings?.effects ?? {}) },
});

/** Text fields that still contain unedited starter hints. */
export function findPlaceholders(site, letters = [], timeline = []) {
  const found = [];
  const check = (label, value) => {
    if (typeof value === 'string' && value.startsWith(PLACEHOLDER_PREFIX)) found.push(label);
  };
  ['introHeading', 'heroMessage', 'wishPrompt', 'afterWishMessage', 'finalQuote', 'finalMessage'].forEach((k) => check(k, site[k]));
  check('birthdayWishes', site.birthdayWishes?.[0]);
  check('reasons', site.reasons?.[0]);
  letters.forEach((l) => check(`letter:${l.key}`, l.body));
  timeline.forEach((t) => check('timeline', t.title));
  if (site.herName === 'Their Name') found.push('herName');
  if (site.partnerName === 'Your Name') found.push('partnerName');
  return [...new Set(found)];
}

/**
 * Everything one birthday page needs, for ONE owner. Contains NO private (vault) content.
 * `scope` picks the media URL family (see mediaUrl).
 */
export async function buildSiteContent(site, scope = 'public') {
  const owner = site.owner;
  const [letters, galleryDocs, timelineDocs, vaultConfig] = await Promise.all([
    Letter.find({ owner }).lean(),
    GalleryMemory.find({ owner }).populate('asset').lean(),
    TimelineEntry.find({ owner }).populate('asset').lean(),
    VaultConfig.exists({ owner }),
  ]);

  const reasons = Array.from({ length: 20 }, (_, i) => site.reasons?.[i] || '');
  const letterByKey = Object.fromEntries(letters.map((l) => [l.key, l]));
  const pick = (key) => ({ title: letterByKey[key]?.title || '', body: letterByKey[key]?.body || '' });
  const url = (id, thumb = false) => mediaUrl(id, { thumb, scope });

  return {
    site: {
      siteName: site.siteName,
      herName: site.herName,
      birthDate: site.birthDate,
      partnerName: site.partnerName,
      introHeading: site.introHeading,
      introSubtitle: site.introSubtitle,
      heroMessage: site.heroMessage,
      birthdayWishes: site.birthdayWishes,
      wishPrompt: site.wishPrompt,
      afterWishMessage: site.afterWishMessage,
      finalQuote: site.finalQuote,
      finalMessage: site.finalMessage,
      reasons,
      future: {
        places: site.future?.places || [],
        dreams: site.future?.dreams || [],
        promises: site.future?.promises || [],
        memories: site.future?.memories || [],
      },
      photos: {
        intro: url(site.photos?.intro),
        hero: url(site.photos?.hero),
        final: url(site.photos?.final),
      },
      music: { title: site.music?.title || 'Our Song', url: url(site.music?.asset) },
      settings: serializeSettings(site),
      vaultEnabled: Boolean(vaultConfig),
    },
    gallery: galleryDocs
      .filter((g) => g.asset && g.asset.visibility === 'public')
      .sort(byDateThenCreated)
      .map((g) => ({
        id: String(g._id),
        url: url(g.asset._id),
        thumbUrl: url(g.asset._id, true),
        width: g.asset.width,
        height: g.asset.height,
        caption: g.caption,
        date: g.date,
      })),
    timeline: timelineDocs.sort(byDateThenCreated).map((t) => ({
      id: String(t._id),
      date: t.date,
      title: t.title,
      description: t.description,
      photoUrl: t.asset && t.asset.visibility === 'public' ? url(t.asset._id, true) : null,
    })),
    letters: {
      heart: pick('heart'),
      openWhen: ['open-when-miss', 'open-when-sad', 'open-when-hug'].map((key) => ({ key, ...pick(key) })),
      futureWife: pick('future-wife'),
    },
  };
}

export const getOwnSite = (ownerId) => SiteContent.findOne({ owner: ownerId });
