/**
 * ONE-TIME migration of an existing SINGLE-SITE database (the old template) to the multi-tenant schema.
 *
 * It turns the website that already lives in your database into the first CUSTOMER's workspace, so nothing you
 * already built is lost:
 *   1. creates (or reuses) a customer account for you
 *   2. stamps every existing site, letter, timeline entry, gallery photo, private photo/message, journal entry,
 *      media file and the vault password with that customer as `owner`
 *   3. gives the site a public link name (/birthday/<slug>) and keeps it published
 *   4. removes the old single-site unique indexes (key_1) and the old sessions
 *   5. builds the new indexes
 *
 * Safe to re-run: documents that already have an owner are never touched.
 *
 *   # preview only, changes nothing
 *   OWNER_PASSWORD='...' npm run migrate -- --owner-email you@example.com --owner-name "Your Name" --dry-run
 *
 *   # real run (BACK UP YOUR DATABASE FIRST: Atlas > Backup, or mongodump)
 *   OWNER_PASSWORD='a-long-password-10+' npm run migrate -- --owner-email you@example.com --owner-name "Your Name" --slug yourname
 *
 * Options:  --owner-email  --owner-name  --slug (default: from the name)  --unpublished  --dry-run
 * OWNER_PASSWORD is only needed when the customer account does not exist yet. It is never printed.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ensureIndexes } from '../services/indexes.js';
import { generateSlug, isSlugAvailable, validateSlug } from '../services/slug.js';
import { validateUserPassword } from '../utils/passwordPolicy.js';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

const dryRun = flag('dry-run');
const COLLECTIONS = [
  'sitecontents', 'letters', 'timelineentries', 'gallerymemories', 'privatemedias',
  'privatemessages', 'journalentries', 'mediaassets', 'vaultconfigs',
];

async function dropIfExists(coll, indexName) {
  const indexes = await coll.indexes().catch(() => []);
  if (indexes.some((i) => i.name === indexName)) {
    if (!dryRun) await coll.dropIndex(indexName);
    console.log(`  ${dryRun ? 'would drop' : 'dropped'} legacy index ${coll.collectionName}.${indexName}`);
  }
}

async function main() {
  const email = (arg('owner-email') || '').trim().toLowerCase();
  const name = (arg('owner-name') || '').trim();
  if (!email || !name) throw new Error('Pass --owner-email and --owner-name (the customer who will own the existing website).');

  await connectDB();
  const db = mongoose.connection.db;
  console.log(`Database: ${db.databaseName}${dryRun ? '   (DRY RUN: nothing will be changed)' : ''}\n`);

  // 1. What is there?
  const legacy = {};
  for (const name_ of COLLECTIONS) {
    // eslint-disable-next-line no-await-in-loop
    legacy[name_] = await db.collection(name_).countDocuments({ owner: { $exists: false } }).catch(() => 0);
  }
  console.log('Documents without an owner (legacy single-site data):');
  for (const [k, v] of Object.entries(legacy)) console.log(`  ${k.padEnd(18)} ${v}`);
  const total = Object.values(legacy).reduce((a, b) => a + b, 0);
  if (total === 0) console.log('\nNothing to migrate. (Already migrated, or a fresh database.)');

  // 2. The owner account
  let owner = await User.findOne({ email });
  if (owner) {
    console.log(`\nUsing existing customer account ${email}`);
  } else {
    const password = process.env.OWNER_PASSWORD || '';
    const problem = validateUserPassword(password, { email, name });
    if (problem) throw new Error(`OWNER_PASSWORD: ${problem}`);
    console.log(`\n${dryRun ? 'Would create' : 'Creating'} customer account ${email}`);
    if (!dryRun) owner = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  }
  const ownerId = owner?._id ?? new mongoose.Types.ObjectId();

  // 3. Slug for the existing site
  const legacySite = await db.collection('sitecontents').findOne({ owner: { $exists: false } });
  let slug = (arg('slug') || '').trim().toLowerCase();
  if (legacySite) {
    if (slug) {
      const problem = validateSlug(slug);
      if (problem) throw new Error(`--slug: ${problem}`);
      if (!(await isSlugAvailable(slug, owner?._id))) throw new Error(`--slug "${slug}" is already taken.`);
    } else {
      slug = await generateSlug(name);
    }
    console.log(`Public link for the existing website: /birthday/${slug}  (${flag('unpublished') ? 'unpublished' : 'published'})`);
  }

  // 4. Drop the old single-site unique indexes (they would make a second customer impossible)
  console.log('\nLegacy indexes:');
  await dropIfExists(db.collection('sitecontents'), 'key_1');
  await dropIfExists(db.collection('letters'), 'key_1');
  await dropIfExists(db.collection('vaultconfigs'), 'key_1');

  if (dryRun) {
    console.log('\nDry run finished. Re-run without --dry-run to apply.');
    return;
  }

  // 5. Stamp ownership. Raw driver calls: the old documents carry fields (like `key`) the new schemas do not.
  for (const coll of COLLECTIONS) {
    const update = { $set: { owner: ownerId } };
    if (coll === 'sitecontents') {
      update.$set = { owner: ownerId, slug, previousSlugs: [], published: !flag('unpublished'), publishedAt: flag('unpublished') ? null : new Date() };
      update.$unset = { key: '' };
    }
    if (coll === 'vaultconfigs') update.$unset = { key: '' };
    // eslint-disable-next-line no-await-in-loop
    const r = await db.collection(coll).updateMany({ owner: { $exists: false } }, update);
    if (r.modifiedCount) console.log(`  ${coll}: ${r.modifiedCount} document(s) assigned to ${email}`);
  }

  // Old sessions belong to the old cookie/route layout. Everyone logs in again.
  const s = await db.collection('sessions').deleteMany({});
  console.log(`  sessions: ${s.deletedCount} old session(s) cleared`);

  await ensureIndexes();
  console.log('\nMigration complete. Log in at /login with the customer account above to manage the website.');
  console.log('Then run "npm run seed" to make sure the platform-owner account exists (separate from the customer account).');
}

main()
  .catch((err) => {
    console.error(`\nMigration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
