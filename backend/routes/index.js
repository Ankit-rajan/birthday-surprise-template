import { Router } from 'express';
import publicRoutes from './public.js';
import vaultRoutes from './vault.js';
import adminRoutes from './admin.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/vault', vaultRoutes);
router.use('/admin', adminRoutes);
router.use('/', publicRoutes);

export default router;
