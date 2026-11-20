/**
 * One-time (and repeatable) PLATFORM setup:
 *   - creates the platform-owner account from ADMIN_EMAIL / ADMIN_PASSWORD
 *
 *   npm run seed                    -> creates the platform owner if missing
 *   npm run seed -- --reset-admin   -> also resets the platform owner's password
 *
 * Customers are NOT seeded: they register themselves. The platform owner is a separate kind of account that
 * can manage users but is not a customer and has no birthday website. Passwords are bcrypt-hashed (cost 12)
 * and never printed or logged.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { AdminUser } from '../models/AdminUser.js';
import { ensureIndexes } from '../services/indexes.js';
import { validateAdminPassword } from '../utils/passwordPolicy.js';

const resetAdmin = process.argv.includes('--reset-admin');

async function main() {
  await connectDB();
  await ensureIndexes();

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const existing = email ? await AdminUser.findOne({ email }) : null;

  if (!existing || resetAdmin) {
    if (!email) throw new Error('Set ADMIN_EMAIL in backend/.env first.');
    const problem = validateAdminPassword(adminPassword);
    if (problem) throw new Error(problem);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await AdminUser.findOneAndUpdate(
      { email },
      { passwordHash, failedAttempts: 0, lockedUntil: null, role: 'admin' },
      { upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`Platform owner account ${existing ? 'reset' : 'created'}: ${email}`);
  } else {
    console.log(`Platform owner account already exists: ${email} (use --reset-admin to change its password)`);
  }

  console.log(`Done. (${env.isProd ? 'production' : 'development'} database)`);
}

main()
  .catch((err) => {
    console.error(`\nSeed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
