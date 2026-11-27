import { SiteContent } from '../models/SiteContent.js';
import { Letter } from '../models/Letter.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { PLACEHOLDER_PREFIX } from './defaults.js';
import { siteFeatures, siteRelationship, siteAppearance, siteCopyOverrides } from './siteState.js';

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

/** The old settings shape, kept for the existing Customize page. The switches are the source of truth, so both always agree. */
export const serializeSettings = (site, features = siteFeatures(site)) => ({
  cake: { ...SITE_SETTINGS_DEFAULTS.cake, ...(site.settings?.cake?.toObject?.() ?? site.settings?.cake ?? {}), showAge: features.showAge },
  effects: { petals: features.petals, confetti: features.confetti, celebrationSounds: features.celebrationSounds },
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
  const f = siteFeatures(site);
  const [letters, galleryDocs, timelineDocs, vaultConfig] = await Promise.all([
    Letter.find({ owner }).lean(),
    f.gallery || f.videoGallery ? GalleryMemory.find({ owner }).populate('asset').lean() : [],
    f.timeline ? TimelineEntry.find({ owner }).populate('asset').lean() : [],
    f.vault ? VaultConfig.exists({ owner }) : null,
  ]);

  const reasons = f.flipCards ? Array.from({ length: 20 }, (_, i) => site.reasons?.[i] || '') : [];
  const letterByKey = Object.fromEntries(letters.map((l) => [l.key, l]));
  const pick = (key, on) => ({ title: on ? letterByKey[key]?.title || '' : '', body: on ? letterByKey[key]?.body || '' : '' });
  const url = (id, thumb = false) => mediaUrl(id, { thumb, scope });
  const gate = (on, value, empty = '') => (on ? value : empty);
  const list = (on, arr) => (on ? arr || [] : []);
  const kindOf = (g) => g.asset?.kind;
  const publicGallery = galleryDocs.filter((g) => g.asset && g.asset.visibility === 'public').sort(byDateThenCreated);

  return {
    site: {
      siteName: site.siteName,
      herName: site.herName,
      birthDate: site.birthDate,
      partnerName: site.partnerName,
      introHeading: gate(f.envelope, site.introHeading),
      introSubtitle: gate(f.envelope, site.introSubtitle),
      heroMessage: gate(f.introMessage, site.heroMessage),
      birthdayWishes: list(f.birthdayWishes, site.birthdayWishes),
      wishPrompt: gate(f.celebrationMessages, site.wishPrompt),
      afterWishMessage: gate(f.celebrationMessages, site.afterWishMessage),
      finalQuote: gate(f.closing, site.finalQuote),
      finalMessage: gate(f.closing, site.finalMessage),
      reasons,
      future: {
        places: list(f.future, site.future?.places),
        dreams: list(f.future, site.future?.dreams),
        promises: list(f.future, site.future?.promises),
        memories: list(f.future && f.sharedMemories, site.future?.memories),
      },
      photos: {
        intro: f.envelope ? url(site.photos?.intro) : null,
        hero: f.hero ? url(site.photos?.hero) : null,
        final: f.closing ? url(site.photos?.final) : null,
      },
      music: { title: site.music?.title || 'Our Song', url: f.music ? url(site.music?.asset) : null },
      settings: serializeSettings(site, f),
      vaultEnabled: Boolean(vaultConfig) && f.vault,
      relationship: siteRelationship(site),
      features: f,
      appearance: siteAppearance(site),
      copy: siteCopyOverrides(site),
    },
    gallery: f.gallery
      ? publicGallery
          .filter((g) => kindOf(g) === 'image')
          .map((g) => ({
            id: String(g._id),
            url: url(g.asset._id),
            thumbUrl: url(g.asset._id, true),
            width: g.asset.width,
            height: g.asset.height,
            caption: g.caption,
            date: g.date,
          }))
      : [],
    videos: f.videoGallery
      ? publicGallery
          .filter((g) => kindOf(g) === 'video')
          .map((g) => ({ id: String(g._id), url: url(g.asset._id), mime: g.asset.mime, caption: g.caption, date: g.date }))
      : [],
    timeline: f.timeline
      ? timelineDocs.sort(byDateThenCreated).map((t) => ({
          id: String(t._id),
          date: t.date,
          title: t.title,
          description: t.description,
          photoUrl: t.asset && t.asset.visibility === 'public' ? url(t.asset._id, true) : null,
        }))
      : [],
    letters: {
      heart: pick('heart', f.mainLetter),
      openWhen: f.openWhenLetters ? ['open-when-miss', 'open-when-sad', 'open-when-hug'].map((key) => ({ key, ...pick(key, true) })) : [],
      futureWife: pick('future-wife', f.futureLetter),
    },
  };
}

export const getOwnSite = (ownerId) => SiteContent.findOne({ owner: ownerId });
