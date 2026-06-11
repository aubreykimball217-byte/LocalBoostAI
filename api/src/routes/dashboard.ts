import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, dashboardController.getDashboardSummary);
router.get('/rating-trend', authenticate, dashboardController.getRatingTrend);
router.get('/lead-trend', authenticate, dashboardController.getLeadTrend);
router.get('/review-distribution', authenticate, dashboardController.getReviewDistribution);
router.get('/benchmarking/:businessId', authenticate, dashboardController.getCompetitiveBenchmarking);
router.get('/social-proof/:businessId', dashboardController.getSocialProofData);

export default router;
