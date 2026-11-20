/**
 * The customer dashboard API (mounted at /api/app, behind userAuth + csrfProtect).
 *
 * TENANCY RULES, enforced in every function below:
 *   1. The owner id ALWAYS comes from the session (`req.user._id`), never from the body, query or URL.
 *   2. Every read, update and delete filters on `owner`. A document that exists but belongs to someone else
 *      is indistinguishable from one that does not exist (404), so IDs cannot be probed.
 *   3. Uploaded assets are stamped with the owner and can only be attached to / deleted by that owner.
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { SiteContent } from '../models/SiteContent.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { Letter } from '../models/Letter.js';
import { PrivateMedia } from '../models/PrivateMedia.js';
import { PrivateMessage } from '../models/PrivateMessage.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { env } from '../config/env.js';
import { destroyVaultSessionsForOwner } from '../services/sessions.js';
import {
  buildSiteContent,
  findPlaceholders,
  mediaUrl,
  serializeSettings,
} from '../services/content.js';
import { ingestUpload, deleteAsset, streamAsset, storageUsed } from '../services/media.js';
import { applyAanyaStarter } from '../services/workspace.js';
import { isSlugAvailable, validateSlug } from '../services/slug.js';
import { HttpError, asyncHandler, objectId, toDate } from '../utils/httpError.js';
import { validateVaultPassword } from '../utils/passwordPolicy.js';

const str = (max) => z.string().trim().max(max);
const dateField = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional();
const MAX = { gallery: 60, timeline: 60, privateMedia: 60, messages: 200 };

const mySite = async (req) => {
  const site = await SiteContent.findOne({ owner: req.user._id });
  if (!site) throw new HttpError(404, 'Website not found');
  return site;
};

async function assertRoom(Model, ownerId, max, label) {
  if ((await Model.countDocuments({ owner: ownerId })) >= max) {
    throw new HttpError(400, `You can add up to ${max} ${label}. Remove one to add another.`);
  }
}

/* --------------------------------------------------------------- the site */

const app = (id, thumb = false) => mediaUrl(id, { thumb, scope: 'app' });

const editableContent = (site) => ({
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
  reasons: Array.from({ length: 20 }, (_, i) => site.reasons?.[i] || ''),
  future: {
    places: site.future?.places || [],
    dreams: site.future?.dreams || [],
    promises: site.future?.promises || [],
    memories: site.future?.memories || [],
  },
  photos: { intro: app(site.photos?.intro, true), hero: app(site.photos?.hero, true), final: app(site.photos?.final, true) },
  music: { title: site.music?.title || '', url: app(site.music?.asset) },
  settings: serializeSettings(site),
});

async function dashboardPayload(site) {
  const [letters, timeline, vault, used] = await Promise.all([
    Letter.find({ owner: site.owner }, { key: 1, body: 1 }).lean(),
    TimelineEntry.find({ owner: site.owner }, { title: 1 }).lean(),
    VaultConfig.exists({ owner: site.owner }),
    storageUsed(site.owner),
  ]);
  return {
    slug: site.slug,
    published: site.published,
    publishedAt: site.publishedAt,
    publicPath: `/birthday/${site.slug}`,
    vaultEnabled: Boolean(vault),
    placeholders: findPlaceholders(site, letters, timeline),
    storage: { usedBytes: used, quotaBytes: env.maxUserStorageMb * 1024 * 1024 },
    content: editableContent(site),
  };
}

export const getSite = asyncHandler(async (req, res) => res.json(await dashboardPayload(await mySite(req))));

const lines = (maxItems, maxLen) => z.array(str(maxLen)).max(maxItems);
const contentSchema = z
  .object({
    siteName: str(120),
    herName: str(60),
    birthDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must look like YYYY-MM-DD, e.g. 2000-01-31')
      .refine((v) => {
        const [y, m, d] = v.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        return y >= 1900 && y <= 2100 && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
      }, 'That is not a real calendar date.'),
    partnerName: str(60),
    introHeading: str(200),
    introSubtitle: str(300),
    heroMessage: str(3000),
    birthdayWishes: lines(12, 500),
    wishPrompt: str(300),
    afterWishMessage: str(1000),
    finalQuote: str(300),
    finalMessage: str(300),
    reasons: lines(20, 600),
    musicTitle: str(120),
    future: z.object({
      places: lines(30, 300),
      dreams: lines(30, 300),
      promises: lines(30, 300),
      memories: lines(30, 300),
    }),
  })
  .partial()
  .strict();

export const updateContent = asyncHandler(async (req, res) => {
  const data = contentSchema.parse(req.body);
  const $set = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'future') {
      for (const [k, v] of Object.entries(value || {})) $set[`future.${k}`] = v.filter(Boolean);
    } else if (key === 'musicTitle') {
      $set['music.title'] = value;
    } else if (key === 'birthdayWishes') {
      $set[key] = value.filter(Boolean);
    } else if (key === 'reasons') {
      $set[key] = Array.from({ length: 20 }, (_, i) => value[i] || '');
    } else {
      $set[key] = value;
    }
  }
  const site = await SiteContent.findOneAndUpdate({ owner: req.user._id }, { $set }, { new: true });
  if (!site) throw new HttpError(404, 'Website not found');
  res.json(await dashboardPayload(site));
});

const settingsSchema = z
  .object({
    cake: z
      .object({
        theme: z.enum(['rose', 'chocolate', 'vanilla', 'berry', 'midnight']),
        candles: z.number().int().min(1).max(9),
        showAge: z.boolean(),
      })
      .partial()
      .strict(),
    effects: z
      .object({ petals: z.boolean(), confetti: z.boolean(), celebrationSounds: z.boolean() })
      .partial()
      .strict(),
  })
  .partial()
  .strict();

export const updateSettings = asyncHandler(async (req, res) => {
  const data = settingsSchema.parse(req.body);
  const $set = {};
  for (const [group, values] of Object.entries(data)) {
    for (const [k, v] of Object.entries(values)) $set[`settings.${group}.${k}`] = v;
  }
  const site = await SiteContent.findOneAndUpdate({ owner: req.user._id }, { $set }, { new: true });
  if (!site) throw new HttpError(404, 'Website not found');
  res.json(await dashboardPayload(site));
});

/** The owner's own rendering of the page. Works while unpublished, and only for the owner. */
export const preview = asyncHandler(async (req, res) => {
  const site = await mySite(req);
  res.json({ ...(await buildSiteContent(site, 'app')), published: site.published, slug: site.slug });
});

/* ----------------------------------------------- link name and publishing */

const slugSchema = z.object({ slug: z.string().trim().toLowerCase().max(60) });

export const checkSlug = asyncHandler(async (req, res) => {
  const { slug } = slugSchema.parse({ slug: req.query.slug });
  const problem = validateSlug(slug);
  if (problem) return res.json({ available: false, reason: problem });
  const available = await isSlugAvailable(slug, req.user._id);
  return res.json({ available, reason: available ? '' : 'That link name is already taken.' });
});

export const updateSlug = asyncHandler(async (req, res) => {
  const { slug } = slugSchema.parse(req.body);
  const problem = validateSlug(slug);
  if (problem) throw new HttpError(400, problem);
  const site = await mySite(req);
  if (slug === site.slug) return res.json(await dashboardPayload(site));
  if (!(await isSlugAvailable(slug, req.user._id))) throw new HttpError(409, 'That link name is already taken.');

  // Keep the old name reserved for this owner (capped), so a link already shared can never be hijacked.
  const previous = [site.slug, ...site.previousSlugs.filter((s) => s !== slug && s !== site.slug)].slice(0, 10);
  try {
    site.previousSlugs = previous;
    site.slug = slug;
    await site.save();
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'That link name is already taken.');
    throw err;
  }
  return res.json(await dashboardPayload(site));
});

const publishSchema = z.object({ acknowledgePlaceholders: z.boolean().optional() }).optional().default({});

export const publish = asyncHandler(async (req, res) => {
  const { acknowledgePlaceholders } = publishSchema.parse(req.body ?? {});
  const site = await mySite(req);
  const [letters, timeline] = await Promise.all([
    Letter.find({ owner: site.owner }, { key: 1, body: 1 }).lean(),
    TimelineEntry.find({ owner: site.owner }, { title: 1 }).lean(),
  ]);
  const placeholders = findPlaceholders(site, letters, timeline);
  if (placeholders.length && !acknowledgePlaceholders) {
    return res.status(409).json({
      error: 'Some parts of your website still contain starter hints. Fill them in, or publish anyway.',
      placeholders,
    });
  }
  site.published = true;
  site.publishedAt = site.publishedAt || new Date();
  await site.save();
  return res.json(await dashboardPayload(site));
});

export const unpublish = asyncHandler(async (req, res) => {
  const site = await mySite(req);
  site.published = false;
  await site.save();
  // Anyone inside the vault is locked out the moment the page goes private.
  await destroyVaultSessionsForOwner(req.user._id);
  res.json(await dashboardPayload(site));
});

export const applyStarter = asyncHandler(async (req, res) => {
  z.object({ template: z.literal('aanya') }).parse(req.body);
  await applyAanyaStarter(req.user._id);
  res.json(await dashboardPayload(await mySite(req)));
});

/* ------------------------------------------------ site photos and music */

const SLOTS = { intro: 'photos.intro', hero: 'photos.hero', final: 'photos.final' };

async function replaceSiteAsset(ownerId, path, newAssetId) {
  const before = await SiteContent.findOneAndUpdate({ owner: ownerId }, { $set: { [path]: newAssetId } }, { new: false });
  const [group, field] = path.split('.');
  const oldId = before?.[group]?.[field];
  if (oldId) await deleteAsset(ownerId, oldId);
}

export const setSitePhoto = asyncHandler(async (req, res) => {
  const path = SLOTS[req.params.slot];
  if (!path) throw new HttpError(404, 'Unknown photo slot');
  const asset = await ingestUpload(req.user._id, req.file, 'public', ['image']);
  await replaceSiteAsset(req.user._id, path, asset._id);
  res.json(await dashboardPayload(await mySite(req)));
});

export const clearSitePhoto = asyncHandler(async (req, res) => {
  const path = SLOTS[req.params.slot];
  if (!path) throw new HttpError(404, 'Unknown photo slot');
  await replaceSiteAsset(req.user._id, path, null);
  res.json(await dashboardPayload(await mySite(req)));
});

export const setMusic = asyncHandler(async (req, res) => {
  const asset = await ingestUpload(req.user._id, req.file, 'public', ['audio']);
  await replaceSiteAsset(req.user._id, 'music.asset', asset._id);
  res.json(await dashboardPayload(await mySite(req)));
});

export const clearMusic = asyncHandler(async (req, res) => {
  await replaceSiteAsset(req.user._id, 'music.asset', null);
  res.json(await dashboardPayload(await mySite(req)));
});

/* --------------------------------------------------------------- gallery */

const itemSchema = z.object({ caption: str(400).optional().default(''), date: dateField });
const itemPatchSchema = z.object({ caption: str(400).optional(), date: dateField });

const galleryJson = (g) => ({
  id: String(g._id),
  caption: g.caption,
  date: g.date,
  thumbUrl: g.asset ? app(g.asset._id, true) : null,
});

export const listGallery = asyncHandler(async (req, res) => {
  const docs = await GalleryMemory.find({ owner: req.user._id }).populate('asset').sort({ createdAt: -1 });
  res.json({ items: docs.map(galleryJson) });
});

export const createGallery = asyncHandler(async (req, res) => {
  const body = itemSchema.parse(req.body);
  await assertRoom(GalleryMemory, req.user._id, MAX.gallery, 'gallery photos');
  const asset = await ingestUpload(req.user._id, req.file, 'public', ['image']);
  const doc = await GalleryMemory.create({ owner: req.user._id, asset: asset._id, caption: body.caption, date: toDate(body.date) });
  await doc.populate('asset');
  res.status(201).json({ item: galleryJson(doc) });
});

export const updateGallery = asyncHandler(async (req, res) => {
  const body = itemPatchSchema.parse(req.body);
  const doc = await GalleryMemory.findOne({ _id: objectId(req.params.id), owner: req.user._id }).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.caption !== undefined) doc.caption = body.caption;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: galleryJson(doc) });
});

export const deleteGallery = asyncHandler(async (req, res) => {
  const doc = await GalleryMemory.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  await deleteAsset(req.user._id, doc.asset);
  await doc.deleteOne();
  res.json({ ok: true });
});

/* -------------------------------------------------------------- timeline */

const timelineSchema = z.object({
  title: str(200).min(1, 'A title is required'),
  description: str(3000).optional().default(''),
  date: dateField,
});
const timelinePatchSchema = timelineSchema.partial();

const timelineJson = (t) => ({
  id: String(t._id),
  title: t.title,
  description: t.description,
  date: t.date,
  thumbUrl: t.asset ? app(t.asset._id, true) : null,
});

export const listTimeline = asyncHandler(async (req, res) => {
  const docs = await TimelineEntry.find({ owner: req.user._id }).populate('asset');
  docs.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  res.json({ items: docs.map(timelineJson) });
});

export const createTimeline = asyncHandler(async (req, res) => {
  const body = timelineSchema.parse(req.body);
  await assertRoom(TimelineEntry, req.user._id, MAX.timeline, 'timeline chapters');
  const asset = req.file ? await ingestUpload(req.user._id, req.file, 'public', ['image']) : null;
  const doc = await TimelineEntry.create({
    owner: req.user._id,
    title: body.title,
    description: body.description,
    date: toDate(body.date),
    asset: asset?._id ?? null,
  });
  await doc.populate('asset');
  res.status(201).json({ item: timelineJson(doc) });
});

export const updateTimeline = asyncHandler(async (req, res) => {
  const body = timelinePatchSchema.parse(req.body);
  const doc = await TimelineEntry.findOne({ _id: objectId(req.params.id), owner: req.user._id }).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.title !== undefined) doc.title = body.title;
  if (body.description !== undefined) doc.description = body.description;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: timelineJson(doc) });
});

export const deleteTimeline = asyncHandler(async (req, res) => {
  const doc = await TimelineEntry.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  if (doc.asset) await deleteAsset(req.user._id, doc.asset);
  await doc.deleteOne();
  res.json({ ok: true });
});

/* --------------------------------------------------------------- letters */

const letterPatch = z.object({ title: str(200).min(1), body: z.string().max(20000) });
const letterJson = (l) => ({ id: String(l._id), key: l.key, title: l.title, body: l.body });

export const listLetters = asyncHandler(async (req, res) => {
  const order = ['heart', 'open-when-miss', 'open-when-sad', 'open-when-hug', 'future-wife'];
  const docs = await Letter.find({ owner: req.user._id }).lean();
  docs.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  res.json({ items: docs.map(letterJson) });
});

export const updateLetter = asyncHandler(async (req, res) => {
  const body = letterPatch.parse(req.body);
  const doc = await Letter.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  doc.title = body.title;
  doc.body = body.body;
  await doc.save();
  res.json({ item: letterJson(doc) });
});

/* ----------------------------------------------------------- private media */

const privateMediaJson = (m) => ({
  id: String(m._id),
  kind: m.asset?.kind,
  caption: m.caption,
  date: m.date,
  previewUrl: m.asset ? app(m.asset._id, m.asset.kind === 'image') : null,
});

export const listPrivateMedia = asyncHandler(async (req, res) => {
  const docs = await PrivateMedia.find({ owner: req.user._id }).populate('asset').sort({ createdAt: -1 });
  res.json({ items: docs.map(privateMediaJson) });
});

export const createPrivateMedia = asyncHandler(async (req, res) => {
  const body = itemSchema.parse(req.body);
  await assertRoom(PrivateMedia, req.user._id, MAX.privateMedia, 'private photos and videos');
  const asset = await ingestUpload(req.user._id, req.file, 'private', ['image', 'video']);
  const doc = await PrivateMedia.create({ owner: req.user._id, asset: asset._id, caption: body.caption, date: toDate(body.date) });
  await doc.populate('asset');
  res.status(201).json({ item: privateMediaJson(doc) });
});

export const updatePrivateMedia = asyncHandler(async (req, res) => {
  const body = itemPatchSchema.parse(req.body);
  const doc = await PrivateMedia.findOne({ _id: objectId(req.params.id), owner: req.user._id }).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.caption !== undefined) doc.caption = body.caption;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: privateMediaJson(doc) });
});

export const deletePrivateMedia = asyncHandler(async (req, res) => {
  const doc = await PrivateMedia.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  await deleteAsset(req.user._id, doc.asset);
  await doc.deleteOne();
  res.json({ ok: true });
});

/** The owner's own bytes (any visibility), for dashboard thumbnails and the unpublished preview. */
export const getOwnAsset = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!asset) throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1', forcePrivate: true });
});

/* -------------------------------------------------------- private messages */

const messageSchema = z.object({
  kind: z.enum(['secret', 'diary', 'letter']),
  title: str(200).optional().default(''),
  body: z.string().trim().min(1, 'Please write a message').max(20000),
  date: dateField,
});
const messagePatchSchema = messageSchema.partial();
const messageJson = (m) => ({ id: String(m._id), kind: m.kind, title: m.title, body: m.body, date: m.date });

export const listMessages = asyncHandler(async (req, res) => {
  const docs = await PrivateMessage.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ items: docs.map(messageJson) });
});

export const createMessage = asyncHandler(async (req, res) => {
  const body = messageSchema.parse(req.body);
  await assertRoom(PrivateMessage, req.user._id, MAX.messages, 'private messages');
  const doc = await PrivateMessage.create({ ...body, owner: req.user._id, date: toDate(body.date) });
  res.status(201).json({ item: messageJson(doc) });
});

export const updateMessage = asyncHandler(async (req, res) => {
  const body = messagePatchSchema.parse(req.body);
  const doc = await PrivateMessage.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  for (const key of ['kind', 'title', 'body']) if (body[key] !== undefined) doc[key] = body[key];
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: messageJson(doc) });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const doc = await PrivateMessage.findOne({ _id: objectId(req.params.id), owner: req.user._id });
  if (!doc) throw new HttpError(404, 'Not found');
  await doc.deleteOne();
  res.json({ ok: true });
});

/* ---------------------------------------------------------- vault password */

const vaultPasswordSchema = z.object({ accountPassword: z.string().min(1).max(200), newPassword: z.string().max(200) });

async function confirmAccountPassword(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(403, 'Your account password was not correct.');
  }
}

export const changeVaultPassword = asyncHandler(async (req, res) => {
  const { accountPassword, newPassword } = vaultPasswordSchema.parse(req.body);
  await confirmAccountPassword(req.user._id, accountPassword);
  const site = await mySite(req);
  const problem = validateVaultPassword(newPassword, { birthDate: site.birthDate, herName: site.herName });
  if (problem) throw new HttpError(400, problem);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await VaultConfig.findOneAndUpdate(
    { owner: req.user._id },
    { passwordHash, failedAttempts: 0, lockedUntil: null },
    { upsert: true, setDefaultsOnInsert: true },
  );
  // Everyone currently inside THIS vault is locked out. Other customers' vaults are untouched.
  await destroyVaultSessionsForOwner(req.user._id);
  res.json({ ok: true, message: 'Vault password saved. Anyone who was inside was locked out.' });
});

export const removeVault = asyncHandler(async (req, res) => {
  const { accountPassword } = z.object({ accountPassword: z.string().min(1).max(200) }).parse(req.body);
  await confirmAccountPassword(req.user._id, accountPassword);
  await VaultConfig.deleteOne({ owner: req.user._id });
  await destroyVaultSessionsForOwner(req.user._id);
  res.json({ ok: true, message: 'The private vault is switched off. Your private photos and messages are kept.' });
});
