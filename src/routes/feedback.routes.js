import { Router } from 'express';
import { createFeedback, getEventFeedback } from '../controllers/feedback.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Public feedback viewing, but submission requires auth
router.get('/:eventId', getEventFeedback);
router.post('/', authenticate, createFeedback);

export default router;
