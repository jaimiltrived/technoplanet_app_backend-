import { Router } from 'express';
import { registerStaff, login } from '../controllers/auth.controller.js';
import { getStaffProfile } from '../controllers/staff.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Auth routes (Public)
router.post('/auth/register', registerStaff);
router.post('/auth/login', login);

// Profile routes (Protected)
router.get('/profile', authenticate, getStaffProfile);

export default router;
