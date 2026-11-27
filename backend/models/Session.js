import mongoose from 'mongoose';

/**
 * Server-side session. Types:
 *   user  - a customer logged in to their dashboard   (userId = User._id)
 *   admin - the platform owner                        (userId = AdminUser._id)
 *   site  - a visitor who unlocked ONE password-protected page (owner = that site's owner)
 *   vault - a visitor who unlocked ONE site's vault   (owner  = that site's owner)
 * Only a SHA-256 hash of the cookie token is stored, so a database leak cannot be replayed as a login.
 * Documents are deleted automatically by the TTL index when the absolute lifetime (expiresAt) passes.
 */
const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  type: { type: String, enum: ['vault', 'admin', 'user', 'site'], required: true, index: true },
  role: { type: String, enum: ['her', 'him', 'admin', 'user', 'visitor'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  csrf: { type: String, required: true },
  lastActivity: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const Session = mongoose.model('Session', sessionSchema);
