import mongoose from 'mongoose';

/**
 * "Her Heart" journal. Title and body are encrypted at rest (AES-256-GCM,
 * see services/crypto.js) so they are not readable in a database dump.
 * Only her role may create, edit or delete; both roles may read.
 */
const journalSchema = new mongoose.Schema(
  {
    titleEnc: { type: String, default: '' },
    bodyEnc: { type: String, required: true },
    author: { type: String, enum: ['her'], default: 'her' },
  },
  { timestamps: true },
);

journalSchema.index({ createdAt: -1 });

export const JournalEntry = mongoose.model('JournalEntry', journalSchema);
