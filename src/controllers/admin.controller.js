import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// ==========================================
// 1. DASHBOARD & STATISTICS APIs
// ==========================================

const getAdminDashboard = asyncHandler(async (req, res, next) => {
  const studentsCount = await prisma.student.count();
  const staffCount = await prisma.staff.count();
  const eventsCount = await prisma.event.count();
  const registrationsCount = await prisma.registration.count({ where: { status: 'REGISTERED' } });

  const recentActivityLogs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return sendResponse(res, 200, 'Admin dashboard summary retrieved successfully', {
    counts: {
      students: studentsCount,
      staff: staffCount,
      events: eventsCount,
      registrations: registrationsCount
    },
    recentLogs: recentActivityLogs
  });
});

const getAdminStatistics = asyncHandler(async (req, res, next) => {
  // Revenue sum
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCESS' },
    select: { amount: true }
  });
  const totalRevenue = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Category wise event count
  const categoryStats = await prisma.category.findMany({
    include: {
      _count: { select: { events: true } }
    }
  });

  return sendResponse(res, 200, 'System-wide statistics retrieved successfully', {
    totalRevenue,
    categoryStats: categoryStats.map(c => ({ category: c.name, count: c._count.events }))
  });
});

// ==========================================
// 2. EVENT MANAGEMENT CRUD
// ==========================================

const createEvent = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    categoryId: z.string(),
    coordinatorId: z.string(),
    date: z.string().transform((val) => new Date(val)),
    time: z.string(),
    venue: z.string(),
    maxParticipants: z.number().int().min(1),
    registrationFee: z.number().min(0),
    registrationDeadline: z.string().transform((val) => new Date(val))
  });

  const data = schema.parse(req.body);

  const event = await prisma.event.create({
    data: {
      ...data,
      registrationFee: data.registrationFee
    }
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: req.user?.id || 'SYSTEM',
      userRole: req.user?.role || 'ADMIN',
      action: 'CREATE_EVENT',
      details: `Created event: ${event.title} (${event.id})`
    }
  });

  return sendResponse(res, 201, 'Event created successfully', event);
});

const updateEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const schema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    categoryId: z.string().optional(),
    coordinatorId: z.string().optional(),
    date: z.string().transform((val) => new Date(val)).optional(),
    time: z.string().optional(),
    venue: z.string().optional(),
    maxParticipants: z.number().int().min(1).optional(),
    registrationFee: z.number().min(0).optional(),
    registrationDeadline: z.string().transform((val) => new Date(val)).optional(),
    isCompleted: z.boolean().optional()
  });

  const data = schema.parse(req.body);

  const updatedEvent = await prisma.event.update({
    where: { id },
    data
  });

  return sendResponse(res, 200, 'Event updated successfully', updatedEvent);
});

const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await prisma.event.delete({ where: { id } });

  return sendResponse(res, 200, 'Event deleted successfully');
});

// ==========================================
// 3. CATEGORY CRUD
// ==========================================

const createCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = z.object({ name: z.string(), description: z.string().optional() }).parse(req.body);

  const category = await prisma.category.create({
    data: { name, description }
  });

  return sendResponse(res, 201, 'Category created successfully', category);
});

const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await prisma.category.findMany();
  return sendResponse(res, 200, 'Categories retrieved successfully', categories);
});

const updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = z.object({ name: z.string().optional(), description: z.string().optional() }).parse(req.body);

  const category = await prisma.category.update({
    where: { id },
    data: { name, description }
  });

  return sendResponse(res, 200, 'Category updated successfully', category);
});

const deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await prisma.category.delete({ where: { id } });
  return sendResponse(res, 200, 'Category deleted successfully');
});

// ==========================================
// 4. STUDENT USER MANAGEMENT
// ==========================================

const getStudents = asyncHandler(async (req, res, next) => {
  const students = await prisma.student.findMany({
    select: { id: true, name: true, email: true, rollNo: true, department: true, semester: true, blocked: true }
  });
  return sendResponse(res, 200, 'Students list retrieved successfully', students);
});

const getStudentById = asyncHandler(async (req, res, next) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: { registrations: { include: { event: true } } }
  });
  if (!student) throw new NotFoundError('Student not found');
  return sendResponse(res, 200, 'Student details retrieved successfully', student);
});

const updateStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const data = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    department: z.string().optional(),
    semester: z.number().optional()
  }).parse(req.body);

  const student = await prisma.student.update({
    where: { id },
    data
  });
  return sendResponse(res, 200, 'Student profile updated successfully', student);
});

const deleteStudent = asyncHandler(async (req, res, next) => {
  await prisma.student.delete({ where: { id: req.params.id } });
  return sendResponse(res, 200, 'Student deleted successfully');
});

// ==========================================
// 5. STAFF (FACULTY/VOLUNTEERS) CRUD
// ==========================================

const createStaff = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    phone: z.string().optional(),
    role: z.enum(['FACULTY', 'VOLUNTEER', 'ADMIN'])
  });

  const data = schema.parse(req.body);

  const existing = await prisma.staff.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Email already registered for a staff member');

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const staff = await prisma.staff.create({
    data: {
      ...data,
      password: hashedPassword
    },
    select: { id: true, name: true, email: true, role: true }
  });

  return sendResponse(res, 201, 'Staff member created successfully', staff);
});

const getStaffList = asyncHandler(async (req, res, next) => {
  const { role } = req.query;

  const staff = await prisma.staff.findMany({
    where: role ? { role: role } : {},
    select: { id: true, name: true, email: true, role: true, phone: true, blocked: true }
  });

  return sendResponse(res, 200, 'Staff list retrieved successfully', staff);
});

const updateStaff = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const data = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(['FACULTY', 'VOLUNTEER', 'ADMIN']).optional()
  }).parse(req.body);

  const staff = await prisma.staff.update({
    where: { id },
    data
  });

  return sendResponse(res, 200, 'Staff member updated successfully', staff);
});

const deleteStaff = asyncHandler(async (req, res, next) => {
  await prisma.staff.delete({ where: { id: req.params.id } });
  return sendResponse(res, 200, 'Staff member deleted successfully');
});

// ==========================================
// 6. PAYMENTS & TRANSACTIONS
// ==========================================

const getPayments = asyncHandler(async (req, res, next) => {
  const payments = await prisma.payment.findMany({
    include: {
      registration: {
        select: {
          student: { select: { name: true, rollNo: true } },
          event: { select: { title: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return sendResponse(res, 200, 'Transaction list retrieved successfully', payments);
});

const getPaymentById = asyncHandler(async (req, res, next) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      registration: {
        include: {
          student: { select: { name: true, rollNo: true, email: true } },
          event: { select: { title: true, date: true } }
        }
      }
    }
  });
  if (!payment) throw new NotFoundError('Payment transaction not found');
  return sendResponse(res, 200, 'Payment details retrieved successfully', payment);
});

const refundPayment = asyncHandler(async (req, res, next) => {
  const { paymentId } = z.object({ paymentId: z.string() }).parse(req.body);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError('Payment record not found');

  const refunded = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'FAILED' } // Set back to failed/refunded
  });

  return sendResponse(res, 200, 'Payment refunded successfully (Simulated)', refunded);
});

// ==========================================
// 7. SECURITY & BLOCK/UNBLOCK
// ==========================================

const getAuditLogs = asyncHandler(async (req, res, next) => {
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' } });
  return sendResponse(res, 200, 'Security audit logs retrieved successfully', logs);
});

const getBlockedUsers = asyncHandler(async (req, res, next) => {
  const blockedStudents = await prisma.student.findMany({
    where: { blocked: true },
    select: { id: true, name: true, email: true, blockedReason: true, rollNo: true }
  }).then(list => list.map(s => ({ ...s, type: 'STUDENT' })));

  const blockedStaff = await prisma.staff.findMany({
    where: { blocked: true },
    select: { id: true, name: true, email: true, blockedReason: true, role: true }
  }).then(list => list.map(s => ({ ...s, type: 'STAFF' })));

  return sendResponse(res, 200, 'Blocked users list retrieved', [...blockedStudents, ...blockedStaff]);
});

const blockUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = z.object({ reason: z.string().min(3) }).parse(req.body);

  let updatedUser = null;

  // 1. Check Student
  const student = await prisma.student.findUnique({ where: { id } });
  if (student) {
    updatedUser = await prisma.student.update({
      where: { id },
      data: { blocked: true, blockedReason: reason, refreshToken: null }
    });
  } else {
    // 2. Check Staff
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (staff) {
      if (staff.role === 'ADMIN') throw new BadRequestError('Cannot block an admin user');
      updatedUser = await prisma.staff.update({
        where: { id },
        data: { blocked: true, blockedReason: reason, refreshToken: null }
      });
    }
  }

  if (!updatedUser) throw new NotFoundError('User not found');

  return sendResponse(res, 200, 'User blocked successfully', { id, blocked: true, reason });
});

const unblockUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let updatedUser = null;

  const student = await prisma.student.findUnique({ where: { id } });
  if (student) {
    updatedUser = await prisma.student.update({
      where: { id },
      data: { blocked: false, blockedReason: null }
    });
  } else {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (staff) {
      updatedUser = await prisma.staff.update({
        where: { id },
        data: { blocked: false, blockedReason: null }
      });
    }
  }

  if (!updatedUser) throw new NotFoundError('User not found');

  return sendResponse(res, 200, 'User unblocked successfully', { id, blocked: false });
});

// ==========================================
// 8. NOTIFICATIONS & GALLERY CRUD
// ==========================================

const createAnnouncement = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    eventId: z.string().optional(), // If empty, system-wide announcement
    title: z.string().min(3),
    message: z.string().min(5)
  });

  const { eventId, title, message } = schema.parse(req.body);
  const sentById = req.user?.id || '';

  const announcement = await prisma.announcement.create({
    data: {
      eventId: eventId || null,
      title,
      message,
      sentById
    }
  });

  return sendResponse(res, 201, 'Announcement sent successfully', announcement);
});

const getAnnouncements = asyncHandler(async (req, res, next) => {
  const list = await prisma.announcement.findMany({
    include: {
      event: { select: { title: true } },
      sentBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return sendResponse(res, 200, 'Announcements list retrieved successfully', list);
});

const addToGallery = asyncHandler(async (req, res, next) => {
  let imageUrl = req.body.imageUrl;
  const imageInput = req.file ? req.file.buffer : req.body.imageUrl;

  if (imageInput && (req.file || (typeof imageInput === 'string' && (imageInput.startsWith('data:image/') || !imageInput.startsWith('http'))))) {
    const uploadResult = await uploadToCloudinary(imageInput, {
      folder: 'rku_app/gallery',
      mimetype: req.file?.mimetype
    });
    imageUrl = uploadResult.secure_url;
  }

  const schema = z.object({
    imageUrl: z.string().url(),
    description: z.string().optional(),
    year: z.coerce.number().int()
  });

  const data = schema.parse({
    ...req.body,
    ...(imageUrl && { imageUrl })
  });

  const gallery = await prisma.gallery.create({
    data
  });

  return sendResponse(res, 201, 'Image added to gallery successfully', gallery);
});


const removeFromGallery = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  await prisma.gallery.delete({ where: { id } });
  return sendResponse(res, 200, 'Image removed from gallery');
});

// ==========================================
// 9. REPORTS APIS
// ==========================================

const getEventsReport = asyncHandler(async (req, res, next) => {
  const events = await prisma.event.findMany({
    include: {
      _count: { select: { registrations: true } }
    }
  });
  return sendResponse(res, 200, 'Events registration report generated', events.map(e => ({
    id: e.id,
    title: e.title,
    registrationsCount: e._count.registrations,
    date: e.date
  })));
});

const getPaymentsReport = asyncHandler(async (req, res, next) => {
  const totalRevenue = await prisma.payment.findMany({
    where: { status: 'SUCCESS' },
    select: { amount: true }
  }).then(p => p.reduce((acc, curr) => acc + Number(curr.amount), 0));

  const list = await prisma.payment.findMany({
    where: { status: 'SUCCESS' },
    include: { registration: { select: { student: { select: { name: true } }, event: { select: { title: true } } } } }
  });

  return sendResponse(res, 200, 'Financial payments report generated', {
    totalRevenue,
    transactions: list
  });
});

const getWinnersReport = asyncHandler(async (req, res, next) => {
  const winners = await prisma.score.findMany({
    where: { rank: { in: [1, 2, 3] } },
    include: {
      event: { select: { title: true } },
      student: { select: { name: true, rollNo: true, department: true } }
    },
    orderBy: { event: { title: 'asc' } }
  });

  return sendResponse(res, 200, 'Top 3 event rankers/winners report generated', winners);
});

export {
  getAdminDashboard,
  getAdminStatistics,
  createEvent,
  updateEvent,
  deleteEvent,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  createStaff,
  getStaffList,
  updateStaff,
  deleteStaff,
  getPayments,
  getPaymentById,
  refundPayment,
  getAuditLogs,
  getBlockedUsers,
  blockUser,
  unblockUser,
  createAnnouncement,
  getAnnouncements,
  addToGallery,
  removeFromGallery,
  getEventsReport,
  getPaymentsReport,
  getWinnersReport
};
