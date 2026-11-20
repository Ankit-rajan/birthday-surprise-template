import mongoose from 'mongoose';

/** Vault-only text: secret messages, diary notes and letters. */
const privateMessageSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['secret', 'diary', 'letter'], required: true },
    title: { type: String, default: '', maxlength: 200 },
    body: { type: String, required: true, maxlength: 20000 },
    date: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PrivateMessage = mongoose.model('PrivateMessage', privateMessageSchema);
