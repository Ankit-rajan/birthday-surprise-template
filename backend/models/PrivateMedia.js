import mongoose from 'mongoose';

/** Metadata for private photographs and videos shown inside the vault. */
const privateMediaSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', required: true },
    caption: { type: String, default: '', maxlength: 400 },
    date: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PrivateMedia = mongoose.model('PrivateMedia', privateMediaSchema);
