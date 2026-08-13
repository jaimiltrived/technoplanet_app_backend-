import { Router } from 'express';
import { getAdminDashboard, getAdminStatistics, createEvent, updateEvent, deleteEvent, createCategory, getCategories, updateCategory, deleteCategory, getStudents, getStudentById, updateStudent, deleteStudent, createStaff, getStaffList, updateStaff, deleteStaff, getPayments, getPaymentById, refundPayment, getAuditLogs, getBlockedUsers, blockUser, unblockUser, createAnnouncement, getAnnouncements, addToGallery, removeFromGallery, getEventsReport, getPaymentsReport, getWinnersReport } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();

// Apply auth and admin-only role checking to all routes
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Dashboard & stats
router.get('/dashboard', getAdminDashboard);
router.get('/statistics', getAdminStatistics);

// Events management
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

// Categories CRUD
router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Student management
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Faculty & coordinator management
router.post('/faculty', createStaff);
router.get('/faculty', getStaffList);
router.put('/faculty/:id', updateStaff);
router.delete('/faculty/:id', deleteStaff);

// Payments & refund logs
router.get('/payments', getPayments);
router.get('/payments/:id', getPaymentById);
router.post('/payment/refund', refundPayment);

// Security logs & blockings
router.get('/security/logs', getAuditLogs);
router.get('/security/blocked-users', getBlockedUsers);
router.put('/security/block-user/:id', blockUser);
router.put('/security/unblock-user/:id', unblockUser);

// Gallery management
router.post('/gallery', addToGallery);
router.delete('/gallery/:id', removeFromGallery);

// Announcement broadacasts
router.post('/notification/send', createAnnouncement);
router.get('/notifications', getAnnouncements);

// Reports APIs
router.get('/report/events', getEventsReport);
router.get('/report/payments', getPaymentsReport);
router.get('/report/winners', getWinnersReport);

export default router;
