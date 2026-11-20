import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { SiteContent } from '../models/SiteContent.js';
import { Letter } from '../models/Letter.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { Session } from '../models/Session.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { GalleryMemory } from '../models/GalleryMemory.js';
import { TimelineEntry } from '../models/TimelineEntry.js';
import { PrivateMedia } from '../models/PrivateMedia.js';
import { PrivateMessage } from '../models/PrivateMessage.js';
import { JournalEntry } from '../models/JournalEntry.js';
import { AdminUser } from '../models/AdminUser.js';

const MODELS = [
  User, SiteContent, Letter, VaultConfig, Session, MediaAsset, GalleryMemory,
  TimelineEntry, PrivateMedia, PrivateMessage, JournalEntry, AdminUser,
];

/**
 * Builds the indexes the multi-tenant schema depends on (unique owner / slug / email, TTL for sessions...).
 * Safe to run on every start. If a database still holds the OLD single-site indexes (e.g. a unique `key` field),
 * it reports exactly what to do instead of crashing or silently continuing with a broken uniqueness rule.
 */
export async function ensureIndexes() {
  for (const Model of MODELS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Model.createIndexes();
    } catch (err) {
      console.error(
        `Index build failed for ${Model.modelName}: ${err.message}\n` +
          '  -> If this database was used by the old single-site version, run:  npm run migrate',
      );
      throw err;
    }
  }
  // Legacy documents without an owner mean the migration has not been run yet.
  const orphan = await SiteContent.collection.countDocuments({ owner: { $exists: false } });
  if (orphan > 0) {
    console.warn(`WARNING: ${orphan} legacy site document(s) have no owner. Run "npm run migrate" before taking traffic.`);
  }
  return mongoose.connection.name;
}
