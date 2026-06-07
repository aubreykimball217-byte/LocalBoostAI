import { Router } from 'express';
import * as campaignController from '../controllers/campaigns.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/send', authenticate, campaignController.sendReviewRequest);
router.get('/qr/:businessId', authenticate, campaignController.getBusinessQRCode);
router.get('/feedback/:token', campaignController.getFeedbackDetails);
router.post('/feedback/:token/submit', campaignController.submitFeedback);

export default router;
