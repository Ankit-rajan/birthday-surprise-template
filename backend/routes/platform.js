import { Router } from 'express';
import { adminAuth, requireRole } from '../middleware/auth.js';
import { csrfProtect, originCheck } from '../middleware/csrf.js';
import { adminLoginLimiter } from '../middleware/rateLimit.js';
import * as p from '../controllers/platformController.js';

/**
 * Platform administration (the owner of the whole service): /api/admin/*
 * Separate collection, separate cookie and separate session type from customers.
 * It exposes account metadata only; there is deliberately NO route that reads a customer's content.
 */
const router = Router();

router.post('/auth/login', originCheck, adminLoginLimiter, p.login);
router.post('/auth/logout', originCheck, p.logout);
router.get('/auth/me', p.me);

router.use(originCheck, adminAuth, requireRole("admin"), csrfProtect);

router.get('/stats', p.stats);
router.get('/users', p.listUsers);
router.patch('/users/:id/status', p.setUserStatus);

export default router;
