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
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

const unlockSchema = z.object({
  password: z.string().min(1).max(200),
  role: z.enum(['her', 'him']),
});

const LOCKOUT_AFTER = 20; // consecutive failures across ALL clients
const LOCKOUT_MINUTES = 15;

export const unlock = asyncHandler(async (req, res) => {
  const { password, role } = unlockSchema.parse(req.body);

  const config = await VaultConfig.findOne({ key: 'main' });
  if (!config) throw new HttpError(503, 'The vault has not been set up yet.');

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
  const { token, session } = await createSession('vault', { role, req });
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
  if (!session) return res.json({ unlocked: false });
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
  const [mediaDocs, messages] = await Promise.all([
    PrivateMedia.find().populate('asset').lean(),
    PrivateMessage.find().lean(),
  ]);

  const media = mediaDocs
    .filter((m) => m.asset && m.asset.visibility === 'private')
    .sort(byDateThenCreated)
    .map((m) => ({
      id: String(m._id),
      kind: m.asset.kind,
      url: `/api/vault/media/${m.asset._id}`,
      thumbUrl: m.asset.kind === 'image' ? `/api/vault/media/${m.asset._id}?thumb=1` : null,
      width: m.asset.width,
      height: m.asset.height,
      caption: m.caption,
      date: m.date,
    }));

  const ofKind = (kind) =>
    messages
      .filter((m) => m.kind === kind)
      .sort(byDateThenCreated)
      .map((m) => ({ id: String(m._id), title: m.title, body: m.body, date: m.date }));

  res.json({ media, secrets: ofKind('secret'), diary: ofKind('diary'), letters: ofKind('letter') });
});

/** Private bytes: requires an unlocked vault session (enforced by vaultAuth on the route). */
export const getVaultMedia = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(objectId(req.params.id));
  if (!asset || asset.visibility !== 'private') throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
});
