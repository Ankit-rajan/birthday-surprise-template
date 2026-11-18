import { buildPublicContent } from '../services/content.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { streamAsset } from '../services/media.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

export const getContent = asyncHandler(async (req, res) => {
  res.json(await buildPublicContent());
});

/** Serves ONLY assets flagged public. A private asset id returns 404 here, never the bytes. */
export const getPublicMedia = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(objectId(req.params.id));
  if (!asset || asset.visibility !== 'public') throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
});
