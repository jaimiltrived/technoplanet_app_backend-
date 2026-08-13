import { Router } from 'express';
import { getCoordinatorDashboard, getCoordinatorEvents, getCoordinatorParticipants, getCoordinatorAttendance, getCoordinatorAnnouncements } from '../controllers/coordinator.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Apply auth and role-based permissions (only VOLUNTEER and ADMIN can perform these)
router.use(authenticate);
router.use(authorize(['VOLUNTEER', 'ADMIN']));

router.get('/dashboard', getCoordinatorDashboard);
router.get('/events', getCoordinatorEvents);
router.get('/participants', getCoordinatorParticipants);
router.get('/attendance', getCoordinatorAttendance);
router.get('/announcements', getCoordinatorAnnouncements);

export default router;
