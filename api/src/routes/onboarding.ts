import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/status', authenticate, onboardingController.getOnboardingStatus);
router.post('/step', authenticate, onboardingController.completeOnboardingStep);

export default router;
