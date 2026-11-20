import mongoose from 'mongoose';

/** Metadata for private photographs and videos shown inside a customer's vault. */
const privateMediaSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', required: true },
    caption: { type: String, default: '', maxlength: 400 },
    date: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PrivateMedia = mongoose.model('PrivateMedia', privateMediaSchema);
