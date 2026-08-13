import { Router } from 'express';
import { createOrder, verifyPayment, getPaymentHistory, getPaymentById } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Secure all payment routes
router.use(authenticate);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.get('/:paymentId', getPaymentById);

export default router;
