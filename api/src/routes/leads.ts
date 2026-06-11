import { Router } from 'express';
import * as leadController from '../controllers/leads.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public lead capture (chat widget, forms)
router.post('/', leadController.createLead);
router.get('/widget-snippet/:businessId', leadController.getChatWidgetSnippet);
router.get('/widget-config/:businessId', leadController.getWidgetConfig);

// Authenticated lead management
router.get('/', authenticate, leadController.getLeads);
router.get('/stats', authenticate, leadController.getLeadStats);
router.put('/:id', authenticate, leadController.updateLead);

export default router;
