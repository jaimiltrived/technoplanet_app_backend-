import { Router } from 'express';
import { registerStaff, login } from '../controllers/auth.controller.js';
import { getStaffProfile } from '../controllers/staff.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Auth routes
router.post('/auth/register', authenticate, authorize(['ADMIN']), registerStaff);
router.post('/auth/login', login);

// Profile routes (Protected)
router.get('/profile', authenticate, getStaffProfile);

export default router;
