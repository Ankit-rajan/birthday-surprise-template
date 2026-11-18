import { Router } from 'express';
import { vaultAuth, requireRole } from '../middleware/auth.js';
import { csrfProtect, originCheck } from '../middleware/csrf.js';
import { unlockLimiter } from '../middleware/rateLimit.js';
import {
  unlock,
  lock,
  sessionStatus,
  heartbeat,
  overview,
  getVaultMedia,
} from '../controllers/vaultController.js';
import { listEntries, createEntry, updateEntry, deleteEntry } from '../controllers/journalController.js';

const router = Router();

/* Open endpoints (no session needed) */
router.post('/unlock', originCheck, unlockLimiter, unlock);
// Locking is harmless to forge, and navigator.sendBeacon (tab close) cannot send custom headers,
// so this one endpoint skips the CSRF token. It still checks Origin.
router.post('/lock', originCheck, lock);
router.get('/session', sessionStatus);

/* Everything below requires an unlocked vault session */
router.use(vaultAuth, csrfProtect);

router.post('/heartbeat', heartbeat);
router.get('/overview', overview);
router.get('/media/:id', getVaultMedia);

/* "Her Heart" journal: both roles read, only `her` writes */
router.get('/journal', listEntries);
router.post('/journal', requireRole('her'), createEntry);
router.put('/journal/:id', requireRole('her'), updateEntry);
router.delete('/journal/:id', requireRole('her'), deleteEntry);

export default router;
