import mongoose from 'mongoose';

/**
 * "Her Heart" journal. Title and body are encrypted at rest (AES-256-GCM, see services/crypto.js)
 * so they are not readable in a database dump. Only the `her` role may write; both roles may read.
 */
const journalSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titleEnc: { type: String, default: '' },
    bodyEnc: { type: String, required: true },
    author: { type: String, enum: ['her'], default: 'her' },
  },
  { timestamps: true },
);

journalSchema.index({ owner: 1, createdAt: -1 });

export const JournalEntry = mongoose.model('JournalEntry', journalSchema);
