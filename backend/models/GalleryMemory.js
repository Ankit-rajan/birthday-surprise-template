import mongoose from 'mongoose';

/** Public gallery photograph ("Our Little World"). */
const gallerySchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset', required: true },
    caption: { type: String, default: '', maxlength: 400 },
    date: { type: Date, default: null },
  },
  { timestamps: true },
);

export const GalleryMemory = mongoose.model('GalleryMemory', gallerySchema);
