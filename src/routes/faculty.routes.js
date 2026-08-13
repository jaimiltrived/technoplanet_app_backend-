import { Router } from 'express';
import { getFacultyDashboard, getAssignedEvents, getAssignedEventById, getEventParticipants, getParticipantById, scanAttendance, markAttendanceManual, getEventAttendanceList, enterScore, editScore, getEventScores, declareRankings, getEventRankings, assignVolunteer, removeVolunteer, getVolunteersList, getFacultyList, getAssignedEventPayments, getFacultyReport } from '../controllers/faculty.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Apply auth and role-based permissions (only FACULTY and ADMIN can perform these)
router.use(authenticate);
router.use(authorize(['FACULTY', 'ADMIN']));

router.get('/dashboard', getFacultyDashboard);
router.get('/events', getAssignedEvents);
router.get('/events/:id', getAssignedEventById);
router.get('/events/:eventId/participants', getEventParticipants);
router.get('/participant/:id', getParticipantById);

// Attendance
router.post('/attendance/scan', scanAttendance);
router.post('/attendance/manual', markAttendanceManual);
router.get('/attendance/:eventId', getEventAttendanceList);

// Scores & Rankings
router.post('/score', enterScore);
router.put('/score/:id', editScore);
router.get('/score/:eventId', getEventScores);
router.post('/declare-rank', declareRankings);
router.get('/rank/:eventId', getEventRankings);

// Volunteer & Coordinator management
router.post('/volunteer', assignVolunteer);
router.delete('/volunteer/:id', removeVolunteer);
router.get('/volunteer', getVolunteersList);
router.get('/coordinator', getFacultyList);

// Reports & Payments
router.get('/payment-history', getAssignedEventPayments);
router.get('/report', getFacultyReport);

export default router;
