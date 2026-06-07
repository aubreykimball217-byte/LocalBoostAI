import { Router } from 'express';
import * as socialController from '../controllers/social.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/generate', authenticate, socialController.generateSocialPosts);
router.get('/posts', authenticate, socialController.getSocialPosts);
router.get('/templates', authenticate, socialController.getSocialTemplates);
router.put('/posts/:id', authenticate, socialController.updateSocialPost);
router.delete('/posts/:id', authenticate, socialController.deleteSocialPost);
router.post('/posts/:id/schedule', authenticate, socialController.schedulePost);

export default router;
