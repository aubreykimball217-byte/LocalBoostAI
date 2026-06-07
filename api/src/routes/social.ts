import { Router } from 'express';
import * as socialController from '../controllers/social.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/generate', authenticate, socialController.generateSocialPosts);
router.get('/', authenticate, socialController.getSocialPosts);
router.post('/:id/schedule', authenticate, socialController.schedulePost);

export default router;
