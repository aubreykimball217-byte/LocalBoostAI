import { Router } from 'express';
import * as onboardingController from '../controllers/onboarding.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/start', authenticate, onboardingController.startOnboarding);
router.post('/step', authenticate, onboardingController.saveOnboardingStep);
router.get('/progress', authenticate, onboardingController.getOnboardingProgress);
router.post('/complete', authenticate, onboardingController.completeOnboarding);

export default router;
