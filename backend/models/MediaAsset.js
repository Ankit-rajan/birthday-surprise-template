import mongoose from 'mongoose';

/**
 * Metadata for a file stored in GridFS. `visibility` decides which bucket
 * holds the bytes AND which route family may serve them:
 *   public  -> /api/media/:id            (anyone)
 *   private -> /api/vault/media/:id      (unlocked vault session)
 *              /api/admin/private-media/:id/file (admin session)
 */
const mediaAssetSchema = new mongoose.Schema(
  {
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
