import { Router } from 'express';
import * as campaignController from '../controllers/campaigns.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Feedback Landing Page (Public)
router.get('/feedback/:token', campaignController.getFeedbackDetails);
router.post('/feedback/:token/submit', campaignController.submitFeedback);

// Campaigns management
router.get('/', authenticate, campaignController.getCampaigns);
router.get('/inactive-customers', authenticate, campaignController.getInactiveCustomers);
router.post('/reactivation', authenticate, campaignController.createReactivationCampaign);
router.post('/:id/send', authenticate, campaignController.sendCampaign);
router.get('/:id/stats', authenticate, campaignController.getCampaignStats);

export default router;
