import fs from 'node:fs';
import { SiteContent } from '../models/SiteContent.js';
import { Letter } from '../models/Letter.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { PrivateMedia } from '../models/PrivateMedia.js';
import { PrivateMessage } from '../models/PrivateMessage.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { DEFAULT_LETTERS, DEFAULT_TIMELINE } from './defaults.js';
import { generateSlug } from './slug.js';
import { deleteAsset } from './media.js';
import { toDate } from '../utils/httpError.js';

/** Loaded once. Fictional sample content, offered only as an explicit, opt-in starter template. */
export const AANYA_STARTER = JSON.parse(fs.readFileSync(new URL('./starters/aanya.json', import.meta.url), 'utf8'));

/** Creates the guided (blank) workspace for a brand-new customer. */
export async function provisionWorkspace(user) {
  let site = null;
  for (let attempt = 0; attempt < 4 && !site; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      site = await SiteContent.create({ owner: user._id, slug: await generateSlug(user.name) });
    } catch (err) {
      if (err?.code !== 11000) throw err; // slug raced with another signup: pick another
    }
  }
  if (!site) throw new Error('Could not allocate a link name');
  await Letter.insertMany(DEFAULT_LETTERS.map((l) => ({ ...l, owner: user._id })));
  await TimelineEntry.insertMany(DEFAULT_TIMELINE.map((t) => ({ ...t, owner: user._id })));
  return site;
}

/**
 * Copies the TEXT of the fictional Aanya & Aarav sample into one customer's own workspace.
 * Only called when that customer explicitly chooses it. No photos, no vault content, nothing about any real user.
 */
export async function applyAanyaStarter(ownerId) {
  const { site, letters, timeline } = AANYA_STARTER;
  await SiteContent.updateOne(
    { owner: ownerId },
    {
      $set: {
        ...Object.fromEntries(Object.entries(site).filter(([k]) => k !== 'future' && k !== 'musicTitle')),
        'music.title': site.musicTitle,
        'future.places': site.future.places,
        'future.dreams': site.future.dreams,
        'future.promises': site.future.promises,
        'future.memories': site.future.memories,
      },
    },
  );
  for (const l of letters) {
    // eslint-disable-next-line no-await-in-loop
    await Letter.updateOne({ owner: ownerId, key: l.key }, { $set: { title: l.title, body: l.body } });
  }
  const old = await TimelineEntry.find({ owner: ownerId });
  for (const t of old) {
    // eslint-disable-next-line no-await-in-loop
    if (t.asset) await deleteAsset(ownerId, t.asset);
  }
  await TimelineEntry.deleteMany({ owner: ownerId });
  await TimelineEntry.insertMany(timeline.map((t) => ({ owner: ownerId, title: t.title, description: t.description, date: toDate(t.date) })));
}

/** Permanently removes a customer and EVERYTHING they own, including the bytes in GridFS. */
export async function deleteAccountAndData(userId) {
  const assets = await MediaAsset.find({ owner: userId });
  for (const a of assets) {
    // eslint-disable-next-line no-await-in-loop
    await deleteAsset(userId, a);
  }
  await Promise.all([
    SiteContent.deleteOne({ owner: userId }),
    Letter.deleteMany({ owner: userId }),
    TimelineEntry.deleteMany({ owner: userId }),
    GalleryMemory.deleteMany({ owner: userId }),
    PrivateMedia.deleteMany({ owner: userId }),
    PrivateMessage.deleteMany({ owner: userId }),
    JournalEntry.deleteMany({ owner: userId }),
    VaultConfig.deleteOne({ owner: userId }),
    Session.deleteMany({ $or: [{ userId }, { owner: userId }] }),
  ]);
  await User.deleteOne({ _id: userId });
}
