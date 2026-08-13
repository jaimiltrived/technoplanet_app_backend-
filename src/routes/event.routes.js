import { Router } from 'express';
import { getEvents, getEventById, getEventsByCategory, searchEvents, registerForEvent, cancelRegistration, getMyEvents, getUpcomingEvents, getCompletedEvents } from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Order matters for express routes matching
router.get('/upcoming', getUpcomingEvents);
router.get('/completed', getCompletedEvents);
router.get('/my-events', authenticate, getMyEvents);
router.get('/search', searchEvents);
router.get('/category/:categoryId', getEventsByCategory);
router.get('/:id', getEventById);
router.get('/', getEvents);

// Registration routes
router.post('/register', authenticate, registerForEvent);
router.delete('/register/:id', authenticate, cancelRegistration);

export default router;
