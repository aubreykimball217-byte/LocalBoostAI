import { Router } from 'express';
import * as reviewController from '../controllers/reviews.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, reviewController.getReviews);
router.get('/stats', authenticate, reviewController.getReviewStats);
router.post('/sync', authenticate, reviewController.syncBusinessReviews);
router.get('/:id', authenticate, reviewController.getReviewById);
router.post('/:id/respond', authenticate, reviewController.respondToReview);
router.post('/:id/generate-response', authenticate, reviewController.generateResponse);

export default router;
