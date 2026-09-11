import { Router } from 'express';
import { getEventPass, getEventQr } from '../controllers/pass.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Secure both routes with JWT authentication
router.get('/event-pass/:registrationId', authenticate, getEventPass);
router.get('/event-qr/:registrationId', authenticate, getEventQr);

export default router;
