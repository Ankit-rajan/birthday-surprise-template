import { SiteContent } from '../models/SiteContent.js';
import { Letter } from '../models/Letter.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { DEFAULT_LETTERS, DEFAULT_TIMELINE } from './defaults.js';

export async function getSiteDoc() {
  return SiteContent.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/** Creates starter content on first run. Never overwrites anything already edited. */
export async function ensureDefaults() {
  await getSiteDoc();
  for (const letter of DEFAULT_LETTERS) {
    await Letter.updateOne({ key: letter.key }, { $setOnInsert: letter }, { upsert: true });
  }
  if ((await TimelineEntry.countDocuments()) === 0) {
    await TimelineEntry.insertMany(DEFAULT_TIMELINE);
  }
}

export const publicMediaUrl = (id, thumb = false) => (id ? `/api/media/${id}${thumb ? '?thumb=1' : ''}` : null);

const byDateThenCreated = (a, b) => {
  const da = a.date ? a.date.getTime() : Infinity;
  const db = b.date ? b.date.getTime() : Infinity;
  return da - db || a.createdAt - b.createdAt;
};

/** Everything the public site needs. Contains NO private content. */
export async function buildPublicContent() {
  const [site, letters, galleryDocs, timelineDocs] = await Promise.all([
    getSiteDoc(),
    Letter.find().lean(),
    GalleryMemory.find().populate('asset').lean(),
    TimelineEntry.find().populate('asset').lean(),
  ]);

  const reasons = Array.from({ length: 20 }, (_, i) => site.reasons?.[i] || '');
  const letterByKey = Object.fromEntries(letters.map((l) => [l.key, l]));
  const pick = (key) => ({ title: letterByKey[key]?.title || '', body: letterByKey[key]?.body || '' });

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
        intro: publicMediaUrl(site.photos?.intro),
        hero: publicMediaUrl(site.photos?.hero),
        final: publicMediaUrl(site.photos?.final),
      },
      music: { title: site.music?.title || 'Our Song', url: publicMediaUrl(site.music?.asset) },
    },
    gallery: galleryDocs
      .filter((g) => g.asset && g.asset.visibility === 'public')
      .sort(byDateThenCreated)
      .map((g) => ({
        id: String(g._id),
        url: publicMediaUrl(g.asset._id),
        thumbUrl: publicMediaUrl(g.asset._id, true),
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
      photoUrl: t.asset && t.asset.visibility === 'public' ? publicMediaUrl(t.asset._id, true) : null,
    })),
    letters: {
      heart: pick('heart'),
      openWhen: ['open-when-miss', 'open-when-sad', 'open-when-hug'].map((key) => ({ key, ...pick(key) })),
      futureWife: pick('future-wife'),
    },
  };
}

export { MediaAsset };
