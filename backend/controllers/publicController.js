import { buildSiteContent } from '../services/content.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { SiteContent } from '../models/SiteContent.js';
import { User } from '../models/User.js';
import { streamAsset } from '../services/media.js';
import { HttpError, asyncHandler, objectId } from '../utils/httpError.js';

/** GET /api/birthday/:slug. Only published sites of active owners get here (resolvePublicSite). */
export const getBirthday = asyncHandler(async (req, res) => {
  if (req.slugRedirect) return res.json({ redirectTo: req.site.slug });
  res.set('Cache-Control', 'no-store');
  return res.json({ slug: req.site.slug, ...(await buildSiteContent(req.site, 'public')) });
});

/**
 * Serves a PUBLIC asset only while its owner's site is published and the owner is active.
 * Private assets, unpublished sites and deactivated owners all answer with the same 404.
 */
export const getPublicMedia = asyncHandler(async (req, res) => {
  const asset = await MediaAsset.findById(objectId(req.params.id));
  if (!asset || asset.visibility !== 'public') throw new HttpError(404, 'Not found');
  const [site, owner] = await Promise.all([
    SiteContent.exists({ owner: asset.owner, published: true }),
    User.exists({ _id: asset.owner, status: 'active' }),
  ]);
  if (!site || !owner) throw new HttpError(404, 'Not found');
  streamAsset(req, res, asset, { thumb: req.query.thumb === '1' });
});
