import mongoose from 'mongoose';

/** A customer's letters: the heart letter, the three "open when" letters and the future letter. */
const letterSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true },
    kind: { type: String, enum: ['heart', 'open-when', 'future-wife'], required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true },
);
letterSchema.index({ owner: 1, key: 1 }, { unique: true });

export const Letter = mongoose.model('Letter', letterSchema);
