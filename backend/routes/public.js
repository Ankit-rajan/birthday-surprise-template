import { Router } from 'express';
import { getContent, getPublicMedia } from '../controllers/publicController.js';

const router = Router();

router.get('/content', getContent);
router.get('/media/:id', getPublicMedia);

export default router;
