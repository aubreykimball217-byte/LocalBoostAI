import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/metrics', authenticate, dashboardController.getDashboardMetrics);
router.get('/benchmarking', authenticate, dashboardController.getCompetitiveBenchmarking);
router.get('/social-proof/:businessId', dashboardController.getSocialProofData);

export default router;
