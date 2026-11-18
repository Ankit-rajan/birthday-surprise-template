import { Router } from 'express';
import { adminAuth, requireRole } from '../middleware/auth.js';
import { csrfProtect, originCheck } from '../middleware/csrf.js';
import { adminLoginLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import { uploadSingle } from '../middleware/upload.js';
import * as c from '../controllers/adminController.js';

const router = Router();

/* Auth (no session needed) */
router.post('/auth/login', originCheck, adminLoginLimiter, c.login);
router.post('/auth/logout', originCheck, c.logout);
router.get('/auth/me', c.me);

/* Everything below: valid admin session + admin role + CSRF token */
router.use(adminAuth, requireRole('admin'), csrfProtect);

router.get('/content', c.getContent);
router.put('/content', c.updateContent);

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
router.get('/private-media/:id/file', c.getPrivateFile);
router.put('/private-media/:id', c.updatePrivateMedia);
router.delete('/private-media/:id', c.deletePrivateMedia);

router.get('/private-messages', c.listMessages);
router.post('/private-messages', c.createMessage);
router.put('/private-messages/:id', c.updateMessage);
router.delete('/private-messages/:id', c.deleteMessage);

router.put('/vault-password', c.changeVaultPassword);

export default router;
