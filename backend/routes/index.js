import { Router } from 'express';
import publicRoutes from './public.js';
import accountRoutes from './account.js';
import platformRoutes from './platform.js';

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/app', accountRoutes); // customers: auth + dashboard
router.use('/admin', platformRoutes); // platform owner only
router.use('/', publicRoutes); // anonymous visitors: published pages + vault

export default router;
