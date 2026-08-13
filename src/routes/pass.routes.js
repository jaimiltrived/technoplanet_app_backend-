import { Router } from 'express';
import { getEventPass, getEventQr } from '../controllers/pass.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Secure both routes with JWT authentication
router.use(authenticate);

router.get('/event-pass/:registrationId', getEventPass);
router.get('/event-qr/:registrationId', getEventQr);

export default router;
