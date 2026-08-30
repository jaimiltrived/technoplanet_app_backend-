import { Router } from 'express';
import { login, logout, refresh, forgotPassword, verifyOtp, resendOtp, resetPassword, changePassword, getProfile, updateProfile, registerStudent, registerStaff } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/refresh-token', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);

// Registration helpers
router.post('/register-student', registerStudent);
router.post('/register-staff', authenticate, authorize(['ADMIN']), registerStaff);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/change-password', authenticate, changePassword);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
