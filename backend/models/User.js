import mongoose from 'mongoose';

/**
 * A paying/registered customer. Platform owners live in AdminUser (a separate collection, separate
 * cookie, separate API prefix), so a customer account can never be promoted to platform admin by data alone.
 * Secrets are `select: false`, so they are never loaded (and therefore never serialised) by accident.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    failedAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    // Only a SHA-256 hash of the emailed token is stored. Single use, short lived.
    resetTokenHash: { type: String, default: null, select: false, index: { sparse: true } },
    resetExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
