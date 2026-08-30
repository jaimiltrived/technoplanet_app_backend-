import { Router } from 'express';
import { getAdminDashboard, getAdminStatistics, createEvent, updateEvent, deleteEvent, createCategory, getCategories, updateCategory, deleteCategory, getStudents, getStudentById, updateStudent, deleteStudent, createStaff, getStaffList, updateStaff, deleteStaff, getPayments, getPaymentById, refundPayment, getAuditLogs, getBlockedUsers, blockUser, unblockUser, createAnnouncement, getAnnouncements, addToGallery, removeFromGallery, getEventsReport, getPaymentsReport, getWinnersReport } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema, createEventSchema, updateEventSchema, blockUserSchema, searchQuerySchema } from '../utils/validation.js';


const router = Router();

// Apply auth and admin-only role checking to all routes
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Dashboard & stats
router.get('/dashboard', getAdminDashboard);
router.get('/statistics', getAdminStatistics);

// Events management
router.post('/events', validate({ body: createEventSchema }), createEvent);
router.put('/events/:id', validate({ params: idParamSchema, body: updateEventSchema }), updateEvent);
router.delete('/events/:id', validate({ params: idParamSchema }), deleteEvent);

// Categories CRUD
router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.put('/categories/:id', validate({ params: idParamSchema }), updateCategory);
router.delete('/categories/:id', validate({ params: idParamSchema }), deleteCategory);

// Student management
router.get('/students', validate({ query: searchQuerySchema }), getStudents);
router.get('/students/:id', validate({ params: idParamSchema }), getStudentById);
router.put('/students/:id', validate({ params: idParamSchema }), updateStudent);
router.delete('/students/:id', validate({ params: idParamSchema }), deleteStudent);

// Faculty & coordinator management
router.post('/faculty', createStaff);
router.get('/faculty', getStaffList);
router.put('/faculty/:id', validate({ params: idParamSchema }), updateStaff);
router.delete('/faculty/:id', validate({ params: idParamSchema }), deleteStaff);

// Staff aliases (matches ApiConfig.adminStaff)
router.post('/staff', createStaff);
router.get('/staff', getStaffList);
router.put('/staff/:id', validate({ params: idParamSchema }), updateStaff);
router.delete('/staff/:id', validate({ params: idParamSchema }), deleteStaff);

// Payments & refund logs
router.get('/payments', getPayments);
router.get('/payments/:id', validate({ params: idParamSchema }), getPaymentById);
router.post('/payment/refund', refundPayment);

// Security logs & blockings
router.get('/security/logs', getAuditLogs);
router.get('/security/blocked-users', getBlockedUsers);
router.put('/security/block-user/:id', validate({ params: idParamSchema, body: blockUserSchema }), blockUser);
router.put('/security/unblock-user/:id', validate({ params: idParamSchema }), unblockUser);

// Audit logs & blocked-users aliases (matches ApiConfig.adminAuditLogs and ApiConfig.adminBlockedUsers)
router.get('/audit-logs', getAuditLogs);
router.get('/blocked-users', getBlockedUsers);

// Gallery management
router.post('/gallery', uploadSingleImage('image'), addToGallery);
router.delete('/gallery/:id', validate({ params: idParamSchema }), removeFromGallery);

// Announcement broadacasts
router.post('/notification/send', createAnnouncement);
router.get('/notifications', getAnnouncements);

// Announcement aliases (matches ApiConfig.adminAnnouncements)
router.post('/announcements', createAnnouncement);
router.get('/announcements', getAnnouncements);

// Reports APIs
router.get('/report/events', getEventsReport);
router.get('/report/payments', getPaymentsReport);
router.get('/report/winners', getWinnersReport);

// Reports aliases (matches ApiConfig.adminEventsReport, adminPaymentsReport, adminWinnersReport)
router.get('/reports/events', getEventsReport);
router.get('/reports/payments', getPaymentsReport);
router.get('/reports/winners', getWinnersReport);

export default router;
