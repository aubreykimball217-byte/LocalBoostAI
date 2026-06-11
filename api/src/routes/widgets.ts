import { Router } from 'express';
import * as widgetController from '../controllers/widgets.js';

const router = Router();

router.get('/:businessId/config', widgetController.getWidgetConfig);
router.get('/:businessId/snippet/:type', widgetController.getWidgetSnippet);
router.get('/:businessId/:type', widgetController.getWidgetData);

export default router;
