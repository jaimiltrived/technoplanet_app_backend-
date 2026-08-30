import { Router } from 'express';
import { getFacultyDashboard, getAssignedEvents, getAssignedEventById, getEventParticipants, getParticipantById, scanAttendance, markAttendanceManual, getEventAttendanceList, enterScore, editScore, getEventScores, declareRankings, getEventRankings, assignVolunteer, removeVolunteer, getVolunteersList, getFacultyList, getAssignedEventPayments, getFacultyReport } from '../controllers/faculty.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, eventIdParamSchema, searchQuerySchema } from '../utils/validation.js';

const router = Router();

// Apply auth and role-based permissions (only FACULTY and ADMIN can perform these)
router.use(authenticate);
router.use(authorize(['FACULTY', 'ADMIN']));

router.get('/dashboard', getFacultyDashboard);
router.get('/events', getAssignedEvents);
router.get('/events/:id', validate({ params: idParamSchema }), getAssignedEventById);
router.get('/events/:eventId/participants', validate({ params: eventIdParamSchema, query: searchQuerySchema }), getEventParticipants);
router.get('/participant/:id', validate({ params: idParamSchema }), getParticipantById);

// Attendance
router.post('/attendance/scan', scanAttendance);
router.post('/attendance/manual', markAttendanceManual);
router.get('/attendance/:eventId', validate({ params: eventIdParamSchema }), getEventAttendanceList);

// Scores & Rankings
router.post('/score', enterScore);
router.put('/score/:id', validate({ params: idParamSchema }), editScore);
router.get('/score/:eventId', validate({ params: eventIdParamSchema }), getEventScores);
router.post('/declare-rank', declareRankings);
router.get('/rank/:eventId', validate({ params: eventIdParamSchema }), getEventRankings);

// Volunteer & Coordinator management
router.post('/volunteer', assignVolunteer);
router.delete('/volunteer/:id', validate({ params: idParamSchema }), removeVolunteer);
router.get('/volunteer', getVolunteersList);
router.get('/coordinator', getFacultyList);

// Reports & Payments
router.get('/payment-history', getAssignedEventPayments);
router.get('/report', getFacultyReport);

export default router;
