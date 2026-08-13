import { Router } from 'express';
import { getCertificates, downloadCertificate } from '../controllers/certificate.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Apply auth lock
router.use(authenticate);

router.get('/', getCertificates);
router.get('/:id/download', downloadCertificate);

export default router;
