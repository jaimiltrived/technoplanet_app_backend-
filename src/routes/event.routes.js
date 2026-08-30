import { Router } from 'express';
import { getEvents, getEventById, getEventsByCategory, searchEvents, registerForEvent, cancelRegistration, getMyEvents, getUpcomingEvents, getCompletedEvents } from '../controllers/event.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, categoryIdParamSchema, eventRegistrationSchema, searchQuerySchema } from '../utils/validation.js';

const router = Router();

// Order matters for express routes matching
router.get('/upcoming', getUpcomingEvents);
router.get('/completed', getCompletedEvents);
router.get('/my-events', authenticate, getMyEvents);
router.get('/search', validate({ query: searchQuerySchema }), searchEvents);
router.get('/category/:categoryId', validate({ params: categoryIdParamSchema }), getEventsByCategory);
router.get('/:id', validate({ params: idParamSchema }), getEventById);
router.get('/', getEvents);

// Registration routes
router.post('/register', authenticate, validate({ body: eventRegistrationSchema }), registerForEvent);
router.delete('/register/:id', authenticate, validate({ params: idParamSchema }), cancelRegistration);

export default router;
