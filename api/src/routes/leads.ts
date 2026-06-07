import { Router } from 'express';
import * as leadController from '../controllers/leads.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public lead capture (chat widget, forms)
router.post('/', leadController.createLead);
router.get('/widget-snippet/:businessId', leadController.getChatWidgetSnippet);

// Authenticated lead management
router.get('/', authenticate, leadController.getLeads);
router.patch('/:id/status', authenticate, leadController.updateLeadStatus);

export default router;
