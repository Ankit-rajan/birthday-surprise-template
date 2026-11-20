import mongoose from 'mongoose';

/**
 * Metadata for a file stored in GridFS. `owner` is the tenant. `visibility` decides which bucket holds
 * the bytes AND which route family may serve them:
 *   public  -> /api/media/:id                       (anyone, but ONLY while the owner's site is published)
 *              /api/app/media/:id                   (the owner, any time, for dashboard + preview)
 *   private -> /api/birthday/:slug/vault/media/:id  (an unlocked vault session of that same site)
 *              /api/app/media/:id                   (the owner)
 */
const mediaAssetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visibility: { type: String, enum: ['public', 'private'], required: true, index: true },
    kind: { type: String, enum: ['image', 'video', 'audio'], required: true },
    mime: { type: String, required: true },
    gridId: { type: mongoose.Schema.Types.ObjectId, required: true },
    size: { type: Number, required: true },
    thumbGridId: { type: mongoose.Schema.Types.ObjectId, default: null },
    thumbSize: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    originalName: { type: String, default: '' },
  },
  { timestamps: true },
);

export const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
