import { Router } from 'express';
import { getEvents, getTemplates, previewRecipients, sendMail, getMailHistory } from '../controllers/mail.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Apply auth — only FACULTY and ADMIN can send mail
router.use(authenticate);
router.use(authorize(['FACULTY', 'ADMIN']));

// Events dropdown for mail compose
router.get('/events', getEvents);

// Mail templates
router.get('/templates', getTemplates);

// Preview recipients before sending
router.post('/recipients/preview', previewRecipients);

// Send mail
router.post('/send', sendMail);

// Mail history / logs
router.get('/history', getMailHistory);

export default router;
