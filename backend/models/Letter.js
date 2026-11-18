import mongoose from 'mongoose';

/** Public letters: the heart letter, the three "open when" letters and the future-wife letter. */
const letterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['heart', 'open-when', 'future-wife'], required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 20000 },
  },
  { timestamps: true },
);

export const Letter = mongoose.model('Letter', letterSchema);
