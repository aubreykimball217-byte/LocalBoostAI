import { Router } from 'express';
import * as auditController from '../controllers/audit.js';

const router = Router();

router.post('/start', auditController.startAudit);
router.post('/claim', auditController.claimAudit);
router.get('/:id', auditController.getAuditStatus);
router.get('/:id/report', auditController.downloadReport);

export default router;
