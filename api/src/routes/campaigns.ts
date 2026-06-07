import { Router } from 'express';
import * as campaignController from '../controllers/campaigns.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Review Request
router.post('/send-request', authenticate, campaignController.sendReviewRequest);
router.get('/qrcode/:businessId', authenticate, campaignController.getBusinessQRCode);

// Feedback Landing Page (Public)
router.get('/feedback/:token', campaignController.getFeedbackDetails);
router.post('/feedback/:token/submit', campaignController.submitFeedback);

// Reactivation
router.get('/inactive-customers', authenticate, campaignController.getInactiveCustomers);
router.post('/reactivation', authenticate, campaignController.createReactivationCampaign);

export default router;
