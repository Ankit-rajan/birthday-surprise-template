/**
 * One-time (and repeatable) setup:
 *   - creates starter site content, letters and timeline placeholders (never overwrites edits)
 *   - creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
 *   - sets the shared vault password from VAULT_PASSWORD
 *
 *   npm run seed                 -> creates anything missing
 *   npm run seed -- --reset-admin   -> also resets the admin password
 *   npm run seed -- --reset-vault   -> also resets the vault password
 *
 * Passwords are bcrypt-hashed (cost 12) and are never printed or logged.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { AdminUser } from '../models/AdminUser.js';
import { VaultConfig } from '../models/VaultConfig.js';
import { ensureDefaults, getSiteDoc } from '../services/content.js';
import { validateAdminPassword, validateVaultPassword } from '../utils/passwordPolicy.js';

const resetAdmin = process.argv.includes('--reset-admin');
const resetVault = process.argv.includes('--reset-vault');

async function main() {
  await connectDB();
  await ensureDefaults();
  console.log('Starter content ready.');

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const existingAdmin = email ? await AdminUser.findOne({ email }) : null;

  if (!existingAdmin || resetAdmin) {
    if (!email) throw new Error('Set ADMIN_EMAIL in backend/.env first.');
    const problem = validateAdminPassword(adminPassword);
    if (problem) throw new Error(problem);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await AdminUser.findOneAndUpdate(
      { email },
      { passwordHash, failedAttempts: 0, lockedUntil: null, role: 'admin' },
      { upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`Admin account ${existingAdmin ? 'reset' : 'created'}: ${email}`);
  } else {
    console.log(`Admin account already exists: ${email} (use --reset-admin to change its password)`);
  }

  const vaultExists = await VaultConfig.exists({ key: 'main' });
  if (!vaultExists || resetVault) {
    const vaultPassword = process.env.VAULT_PASSWORD || '';
    const siteDoc = await getSiteDoc();
    const problem = validateVaultPassword(vaultPassword, { birthDate: siteDoc.birthDate, herName: siteDoc.herName });
    if (problem) throw new Error(problem);
    const passwordHash = await bcrypt.hash(vaultPassword, 12);
    await VaultConfig.findOneAndUpdate(
      { key: 'main' },
      { passwordHash, failedAttempts: 0, lockedUntil: null },
      { upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`Vault password ${vaultExists ? 'reset' : 'set'}.`);
  } else {
    console.log('Vault password already set (change it from the admin dashboard, or use --reset-vault).');
  }

  console.log(`Done. (${env.isProd ? 'production' : 'development'} database)`);
}

main()
  .catch((err) => {
    console.error(`\nSeed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
