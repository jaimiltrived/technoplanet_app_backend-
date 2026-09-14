import { Router } from 'express';
import { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory, 
  getPaymentById, 
  handlePaytmWebhook 
} from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Public Webhook endpoints for Paytm (No authentication required, server-to-server)
router.post('/paytm-webhook', handlePaytmWebhook);
router.post('/webhook', handlePaytmWebhook);

// Secure all student/staff payment routes
router.use(authenticate);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:paymentId', getPaymentById);

export default router;

