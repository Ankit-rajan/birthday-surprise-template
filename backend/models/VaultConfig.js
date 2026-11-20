import mongoose from 'mongoose';

/** One per customer site: the bcrypt hash of that site's private-vault password. */
const vaultConfigSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    passwordHash: { type: String, required: true },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

export const VaultConfig = mongoose.model('VaultConfig', vaultConfigSchema);
