import { Router } from 'express';
import { getBirthday, getPublicMedia } from '../controllers/publicController.js';
import { resolvePublicSite, vaultAuth, requireRole } from '../middleware/auth.js';
import { csrfProtect, originCheck } from '../middleware/csrf.js';
import { unlockLimiter, publicSiteLimiter } from '../middleware/rateLimit.js';
import { unlock, lock, sessionStatus, heartbeat, overview, getVaultMedia } from '../controllers/vaultController.js';
import { listEntries, createEntry, updateEntry, deleteEntry } from '../controllers/journalController.js';

const router = Router();

router.get('/media/:id', getPublicMedia);

/* A published birthday page, plus its private vault. Everything is keyed by the slug in the URL. */
router.get('/birthday/:slug', publicSiteLimiter, resolvePublicSite, getBirthday);

const vault = Router({ mergeParams: true });
vault.use(resolvePublicSite);

/* Open endpoints (no vault session needed) */
vault.post('/unlock', originCheck, unlockLimiter, unlock);
// Locking is harmless to forge, and navigator.sendBeacon (tab close) cannot send custom headers,
// so this one endpoint skips the CSRF token. It still checks Origin.
vault.post('/lock', originCheck, lock);
vault.get('/session', sessionStatus);

/* Everything below requires an unlocked vault session FOR THIS SITE */
vault.use(originCheck, vaultAuth, csrfProtect);
vault.post('/heartbeat', heartbeat);
vault.get('/overview', overview);
vault.get('/media/:id', getVaultMedia);

/* "Her Heart" journal: both roles read, only `her` writes */
vault.get('/journal', listEntries);
vault.post('/journal', requireRole('her'), createEntry);
vault.put('/journal/:id', requireRole('her'), updateEntry);
vault.delete('/journal/:id', requireRole('her'), deleteEntry);

router.use('/birthday/:slug/vault', vault);

export default router;
