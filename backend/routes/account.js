import { Router } from 'express';
import { userAuth } from '../middleware/auth.js';
import { csrfProtect, originCheck } from '../middleware/csrf.js';
import {
  registerLimiter,
  userLoginLimiter,
  passwordResetLimiter,
  uploadLimiter,
  slugLimiter,
} from '../middleware/rateLimit.js';
import { uploadSingle } from '../middleware/upload.js';
import * as a from '../controllers/accountController.js';
import * as c from '../controllers/siteController.js';

/** Customer area: /api/app/* */
const router = Router();

/* No session needed (still Origin-checked, and rate-limited) */
router.post('/auth/register', originCheck, registerLimiter, a.register);
router.post('/auth/login', originCheck, userLoginLimiter, a.login);
router.post('/auth/logout', originCheck, a.logout);
router.get('/auth/me', a.me);
router.post('/auth/forgot-password', originCheck, passwordResetLimiter, a.forgotPassword);
router.post('/auth/reset-password', originCheck, passwordResetLimiter, a.resetPassword);

/* Everything below: valid customer session + CSRF token. Every handler scopes by req.user._id. */
router.use(originCheck, userAuth, csrfProtect);

router.put('/account', a.updateAccount);
router.put('/account/password', a.changePassword);
router.delete('/account', a.deleteAccount);

router.get('/site', c.getSite);
router.put('/site', c.updateContent);
router.put('/site/settings', c.updateSettings);
router.put('/site/features', c.updateFeatures);
router.put('/site/relationship', c.updateRelationship);
router.put('/site/appearance', c.updateAppearance);
router.put('/site/copy', c.updateCopy);
router.put('/site/password', c.setPagePassword);
router.delete('/site/password', c.removePagePassword);
router.get('/site/slug-available', c.checkSlug);
router.put('/site/slug', slugLimiter, c.updateSlug);
router.post('/site/publish', c.publish);
router.post('/site/unpublish', c.unpublish);
router.post('/site/starter', c.applyStarter);
router.get('/preview', c.preview);
router.post('/preview', c.previewDraft);
router.get('/media/:id', c.getOwnAsset);

router.post('/site-photo/:slot', uploadLimiter, uploadSingle('file'), c.setSitePhoto);
router.delete('/site-photo/:slot', c.clearSitePhoto);
router.post('/music', uploadLimiter, uploadSingle('file'), c.setMusic);
router.delete('/music', c.clearMusic);

router.get('/gallery', c.listGallery);
router.post('/gallery', uploadLimiter, uploadSingle('file'), c.createGallery);
router.put('/gallery/:id', c.updateGallery);
router.delete('/gallery/:id', c.deleteGallery);

router.get('/timeline', c.listTimeline);
router.post('/timeline', uploadLimiter, uploadSingle('file'), c.createTimeline);
router.put('/timeline/:id', c.updateTimeline);
router.delete('/timeline/:id', c.deleteTimeline);

router.get('/letters', c.listLetters);
router.put('/letters/:id', c.updateLetter);

router.get('/private-media', c.listPrivateMedia);
router.post('/private-media', uploadLimiter, uploadSingle('file'), c.createPrivateMedia);
router.put('/private-media/:id', c.updatePrivateMedia);
router.delete('/private-media/:id', c.deletePrivateMedia);

router.get('/private-messages', c.listMessages);
router.post('/private-messages', c.createMessage);
router.put('/private-messages/:id', c.updateMessage);
router.delete('/private-messages/:id', c.deleteMessage);

router.put('/vault-password', c.changeVaultPassword);
router.delete('/vault-password', c.removeVault);

export default router;
