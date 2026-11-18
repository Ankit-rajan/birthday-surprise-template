import mongoose from 'mongoose';

/** Singleton holding the bcrypt hash of the shared vault password. */
const vaultConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    passwordHash: { type: String, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export const VaultConfig = mongoose.model('VaultConfig', vaultConfigSchema);
