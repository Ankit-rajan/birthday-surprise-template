import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AdminUser } from '../models/AdminUser.js';
import { SiteContent } from '../models/SiteContent.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { Letter } from '../models/Letter.js';
import { PrivateMedia } from '../models/PrivateMedia.js';
import { PrivateMessage } from '../models/PrivateMessage.js';
import { MediaAsset } from '../models/MediaAsset.js';
import {
  createSession,
  loadSession,
  destroySession,
  destroyAllSessions,
  setSessionCookie,
  clearSessionCookie,
  cookieName,
} from '../services/sessions.js';
import { getSiteDoc, publicMediaUrl } from '../services/content.js';
import { ingestUpload, deleteAsset, streamAsset } from '../services/media.js';
import { HttpError, asyncHandler, objectId, toDate } from '../utils/httpError.js';
import { validateVaultPassword } from '../utils/passwordPolicy.js';

const str = (max) => z.string().trim().max(max);
const dateField = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional();
const FAKE_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps login timing uniform for unknown emails

/* ------------------------------------------------------------------ auth */

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

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

/* --------------------------------------------------------------- content */

const adminContent = (site) => ({
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
  photos: {
    intro: publicMediaUrl(site.photos?.intro, true),
    hero: publicMediaUrl(site.photos?.hero, true),
    final: publicMediaUrl(site.photos?.final, true),
  },
  music: { title: site.music?.title || '', url: publicMediaUrl(site.music?.asset) },
});

export const getContent = asyncHandler(async (req, res) => {
  res.json(adminContent(await getSiteDoc()));
});

const lines = (maxItems, maxLen) => z.array(str(maxLen)).max(maxItems);
const contentSchema = z
  .object({
    siteName: str(120),
    herName: str(60),
    birthDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must look like YYYY-MM-DD, e.g. 2000-01-31'),
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
  .partial();

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
  await getSiteDoc(); // make sure the singleton exists
  const site = await SiteContent.findOneAndUpdate({ key: 'main' }, { $set }, { new: true });
  res.json(adminContent(site));
});

/* ----------------------------------------------- site photos and music */

const SLOTS = { intro: 'photos.intro', hero: 'photos.hero', final: 'photos.final' };

async function replaceSiteAsset(path, newAssetId) {
  const before = await SiteContent.findOneAndUpdate({ key: 'main' }, { $set: { [path]: newAssetId } }, { new: false });
  const [group, field] = path.split('.');
  const oldId = before?.[group]?.[field];
  if (oldId) await deleteAsset(oldId);
}

export const setSitePhoto = asyncHandler(async (req, res) => {
  const path = SLOTS[req.params.slot];
  if (!path) throw new HttpError(404, 'Unknown photo slot');
  const asset = await ingestUpload(req.file, 'public', ['image']);
  await replaceSiteAsset(path, asset._id);
  res.json(adminContent(await getSiteDoc()));
});

export const clearSitePhoto = asyncHandler(async (req, res) => {
  const path = SLOTS[req.params.slot];
  if (!path) throw new HttpError(404, 'Unknown photo slot');
  await replaceSiteAsset(path, null);
  res.json(adminContent(await getSiteDoc()));
});

export const setMusic = asyncHandler(async (req, res) => {
  const asset = await ingestUpload(req.file, 'public', ['audio']);
  await replaceSiteAsset('music.asset', asset._id);
  res.json(adminContent(await getSiteDoc()));
});

export const clearMusic = asyncHandler(async (req, res) => {
  await replaceSiteAsset('music.asset', null);
  res.json(adminContent(await getSiteDoc()));
});

/* --------------------------------------------------------------- gallery */

const itemSchema = z.object({ caption: str(400).optional().default(''), date: dateField });
const itemPatchSchema = z.object({ caption: str(400).optional(), date: dateField });

const galleryJson = (g) => ({
  id: String(g._id),
  caption: g.caption,
  date: g.date,
  thumbUrl: g.asset ? publicMediaUrl(g.asset._id, true) : null,
});

export const listGallery = asyncHandler(async (req, res) => {
  const docs = await GalleryMemory.find().populate('asset').sort({ createdAt: -1 });
  res.json({ items: docs.map(galleryJson) });
});

export const createGallery = asyncHandler(async (req, res) => {
  const body = itemSchema.parse(req.body);
  const asset = await ingestUpload(req.file, 'public', ['image']);
  const doc = await GalleryMemory.create({ asset: asset._id, caption: body.caption, date: toDate(body.date) });
  await doc.populate('asset');
  res.status(201).json({ item: galleryJson(doc) });
});

export const updateGallery = asyncHandler(async (req, res) => {
  const body = itemPatchSchema.parse(req.body);
  const doc = await GalleryMemory.findById(objectId(req.params.id)).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.caption !== undefined) doc.caption = body.caption;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: galleryJson(doc) });
});

export const deleteGallery = asyncHandler(async (req, res) => {
  const doc = await GalleryMemory.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  await deleteAsset(doc.asset);
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
  thumbUrl: t.asset ? publicMediaUrl(t.asset._id, true) : null,
});

export const listTimeline = asyncHandler(async (req, res) => {
  const docs = await TimelineEntry.find().populate('asset');
  docs.sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
  res.json({ items: docs.map(timelineJson) });
});

export const createTimeline = asyncHandler(async (req, res) => {
  const body = timelineSchema.parse(req.body);
  const asset = req.file ? await ingestUpload(req.file, 'public', ['image']) : null;
  const doc = await TimelineEntry.create({
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
  const doc = await TimelineEntry.findById(objectId(req.params.id)).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.title !== undefined) doc.title = body.title;
  if (body.description !== undefined) doc.description = body.description;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: timelineJson(doc) });
});

export const deleteTimeline = asyncHandler(async (req, res) => {
  const doc = await TimelineEntry.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  if (doc.asset) await deleteAsset(doc.asset);
  await doc.deleteOne();
  res.json({ ok: true });
});

/* --------------------------------------------------------------- letters */

const letterPatch = z.object({ title: str(200).min(1), body: z.string().max(20000) });

export const listLetters = asyncHandler(async (req, res) => {
  const order = ['heart', 'open-when-miss', 'open-when-sad', 'open-when-hug', 'future-wife'];
  const docs = await Letter.find().lean();
  docs.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  res.json({ items: docs.map((l) => ({ id: String(l._id), key: l.key, title: l.title, body: l.body })) });
});

export const updateLetter = asyncHandler(async (req, res) => {
  const body = letterPatch.parse(req.body);
  const doc = await Letter.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  doc.title = body.title;
  doc.body = body.body;
  await doc.save();
  res.json({ item: { id: String(doc._id), key: doc.key, title: doc.title, body: doc.body } });
});

/* ----------------------------------------------------------- private media */

const privateMediaJson = (m) => ({
  id: String(m._id),
  kind: m.asset?.kind,
  caption: m.caption,
  date: m.date,
  previewUrl: m.asset
    ? `/api/admin/private-media/${m.asset._id}/file${m.asset.kind === 'image' ? '?thumb=1' : ''}`
    : null,
});

export const listPrivateMedia = asyncHandler(async (req, res) => {
  const docs = await PrivateMedia.find().populate('asset').sort({ createdAt: -1 });
  res.json({ items: docs.map(privateMediaJson) });
});

export const createPrivateMedia = asyncHandler(async (req, res) => {
  const body = itemSchema.parse(req.body);
  const asset = await ingestUpload(req.file, 'private', ['image', 'video']);
  const doc = await PrivateMedia.create({ asset: asset._id, caption: body.caption, date: toDate(body.date) });
  await doc.populate('asset');
  res.status(201).json({ item: privateMediaJson(doc) });
});

export const updatePrivateMedia = asyncHandler(async (req, res) => {
  const body = itemPatchSchema.parse(req.body);
  const doc = await PrivateMedia.findById(objectId(req.params.id)).populate('asset');
  if (!doc) throw new HttpError(404, 'Not found');
  if (body.caption !== undefined) doc.caption = body.caption;
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: privateMediaJson(doc) });
});

export const deletePrivateMedia = asyncHandler(async (req, res) => {
  const doc = await PrivateMedia.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  await deleteAsset(doc.asset);
  await doc.deleteOne();
  res.json({ ok: true });
});

/** Admin-only preview of private bytes (so the dashboard can show thumbnails). */
export const getPrivateFile = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(objectId(req.params.id));
  if (!asset || asset.visibility !== 'private') throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
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
  const docs = await PrivateMessage.find().sort({ createdAt: -1 });
  res.json({ items: docs.map(messageJson) });
});

export const createMessage = asyncHandler(async (req, res) => {
  const body = messageSchema.parse(req.body);
  const doc = await PrivateMessage.create({ ...body, date: toDate(body.date) });
  res.status(201).json({ item: messageJson(doc) });
});

export const updateMessage = asyncHandler(async (req, res) => {
  const body = messagePatchSchema.parse(req.body);
  const doc = await PrivateMessage.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  for (const key of ['kind', 'title', 'body']) if (body[key] !== undefined) doc[key] = body[key];
  if (body.date !== undefined) doc.date = toDate(body.date);
  await doc.save();
  res.json({ item: messageJson(doc) });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const doc = await PrivateMessage.findById(objectId(req.params.id));
  if (!doc) throw new HttpError(404, 'Not found');
  await doc.deleteOne();
  res.json({ ok: true });
});

/* ---------------------------------------------------------- vault password */

const vaultPasswordSchema = z.object({ adminPassword: z.string().min(1).max(200), newPassword: z.string().max(200) });

export const changeVaultPassword = asyncHandler(async (req, res) => {
  const { adminPassword, newPassword } = vaultPasswordSchema.parse(req.body);
  const admin = await AdminUser.findById(req.auth.userId);
  if (!admin || !(await bcrypt.compare(adminPassword, admin.passwordHash))) {
    throw new HttpError(403, 'Your admin password was not correct.');
  }
  const siteDoc = await getSiteDoc();
  const problem = validateVaultPassword(newPassword, { birthDate: siteDoc.birthDate, herName: siteDoc.herName });
  if (problem) throw new HttpError(400, problem);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await VaultConfig.findOneAndUpdate(
    { key: 'main' },
    { passwordHash, failedAttempts: 0, lockedUntil: null },
    { upsert: true, setDefaultsOnInsert: true },
  );
  // Everyone currently inside the vault is locked out and must use the new password.
  await destroyAllSessions('vault');
  res.json({ ok: true, message: 'Vault password changed. All open vault sessions were locked.' });
});
