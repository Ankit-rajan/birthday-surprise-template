import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { PrivateMedia } from '../models/PrivateMedia.js';
import { PrivateMessage } from '../models/PrivateMessage.js';
import { MediaAsset } from '../models/MediaAsset.js';
import {
  createSession,
  loadSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  cookieName,
} from '../services/sessions.js';
import { streamAsset } from '../services/media.js';
import { siteFeatures } from '../services/siteState.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

/*
 * The private "secret place" of ONE published site (/api/birthday/:slug/vault/*). `req.site` was resolved from the
 * URL by resolvePublicSite, and every query below is filtered by `req.site.owner`.
 */

const unlockSchema = z.object({
  password: z.string().min(1).max(200),
  role: z.enum(['her', 'him']),
});

const LOCKOUT_AFTER = 20; // consecutive failures across ALL visitors of this one vault
const LOCKOUT_MINUTES = 15;

export const unlock = asyncHandler(async (req, res) => {
  const { password, role } = unlockSchema.parse(req.body);
  const owner = req.site.owner;

  const config = await VaultConfig.findOne({ owner });
  if (!config) throw new HttpError(404, 'This page has no private area.');

  if (config.lockedUntil && config.lockedUntil > new Date()) {
    throw new HttpError(429, 'The vault is resting after too many wrong attempts. Please try again later.');
  }

  const ok = await bcrypt.compare(password, config.passwordHash);
  if (!ok) {
    config.failedAttempts += 1;
    if (config.failedAttempts >= LOCKOUT_AFTER) {
      config.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
      config.failedAttempts = 0;
    }
    await config.save();
    throw new HttpError(401, 'Incorrect password');
  }

  if (config.failedAttempts !== 0 || config.lockedUntil) {
    config.failedAttempts = 0;
    config.lockedUntil = null;
    await config.save();
  }

  // Replace any session this browser already had.
  await destroySession('vault', req.cookies?.[cookieName.vault]);
  const { token, session } = await createSession('vault', { role, owner, req });
  setSessionCookie(res, 'vault', token);
  res.json({ unlocked: true, role, csrfToken: session.csrf, idleSeconds: env.vaultIdleSeconds });
});

/** Lock Again / logout / tab-close beacon. Always succeeds, never needs a token. */
export const lock = asyncHandler(async (req, res) => {
  await destroySession('vault', req.cookies?.[cookieName.vault]);
  clearSessionCookie(res, 'vault');
  res.json({ unlocked: false });
});

/** Lets the page ask "am I still unlocked?" without producing a 401 in the console. */
export const sessionStatus = asyncHandler(async (req, res) => {
  const session = await loadSession('vault', req.cookies?.[cookieName.vault]);
  if (!session || String(session.owner) !== String(req.site.owner)) return res.json({ unlocked: false });
  return res.json({
    unlocked: true,
    role: session.role,
    csrfToken: session.csrf,
    idleSeconds: env.vaultIdleSeconds,
  });
});

export const heartbeat = (req, res) => res.json({ ok: true });

const byDateThenCreated = (a, b) => {
  const da = a.date ? a.date.getTime() : Infinity;
  const db = b.date ? b.date.getTime() : Infinity;
  return da - db || a.createdAt - b.createdAt;
};

export const overview = asyncHandler(async (req, res) => {
  const owner = req.site.owner;
  const base = `/api/birthday/${req.site.slug}/vault/media`;
  const [mediaDocs, messages] = await Promise.all([
    PrivateMedia.find({ owner }).populate('asset').lean(),
    PrivateMessage.find({ owner }).lean(),
  ]);

  const f = siteFeatures(req.site);
  const media = mediaDocs
    .filter((m) => m.asset && (m.asset.kind === 'video' ? f.privateVideos : f.privatePhotos) && m.asset.visibility === 'private' && String(m.asset.owner) === String(owner))
    .sort(byDateThenCreated)
    .map((m) => ({
      id: String(m._id),
      kind: m.asset.kind,
      url: `${base}/${m.asset._id}`,
      thumbUrl: m.asset.kind === 'image' ? `${base}/${m.asset._id}?thumb=1` : null,
      width: m.asset.width,
      height: m.asset.height,
      caption: m.caption,
      date: m.date,
    }));

  const allowed = { secret: f.secretMessages, diary: f.personalNotes, letter: f.privateLetters };
  const ofKind = (kind) =>
    messages
      .filter((m) => allowed[kind] && m.kind === kind)
      .sort(byDateThenCreated)
      .map((m) => ({ id: String(m._id), title: m.title, body: m.body, date: m.date }));

  res.json({ media, secrets: ofKind('secret'), diary: ofKind('diary'), letters: ofKind('letter') });
});

/** Private bytes: requires an unlocked vault session for THIS site AND an asset owned by this site's owner. */
export const getVaultMedia = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findOne({ _id: objectId(req.params.id), owner: req.site.owner });
  const f = siteFeatures(req.site);
  if (!asset || asset.visibility !== 'private' || !(asset.kind === 'video' ? f.privateVideos : f.privatePhotos)) throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
});
