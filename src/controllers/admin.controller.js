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

  const totalEvents = await prisma.event.count();
  const totalFaculty = await prisma.staff.count({ where: { role: 'FACULTY' } });
  const totalVolunteers = await prisma.staff.count({ where: { role: 'VOLUNTEER' } });
  const totalStudents = await prisma.student.count();

  return sendResponse(res, 200, 'System-wide statistics retrieved successfully', {
    totalRevenue,
    categoryStats: categoryStats.map(c => ({ category: c.name, count: c._count.events })),
    totalEvents,
    totalFaculty,
    totalVolunteers,
    totalStudents
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
    registrationDeadline: z.string().transform((val) => new Date(val)),
    isTeamEvent: z.boolean().default(false),
    minTeamSize: z.number().int().min(1).default(1),
    maxTeamSize: z.number().int().min(1).default(1)
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
    coordinatorId: z.string().optional().nullable(),
    date: z.string().transform((val) => new Date(val)).optional(),
    time: z.string().optional(),
    venue: z.string().optional(),
    maxParticipants: z.number().int().min(1).optional(),
    registrationFee: z.number().min(0).optional(),
    registrationDeadline: z.string().transform((val) => new Date(val)).optional(),
    isCompleted: z.boolean().optional(),
    isTeamEvent: z.boolean().optional(),
    minTeamSize: z.number().int().min(1).optional(),
    maxTeamSize: z.number().int().min(1).optional()
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
    role: z.enum(['FACULTY', 'VOLUNTEER', 'ADMIN']).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long').optional()
  }).parse(req.body);

  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Staff member not found');

  const updateData = { ...data };
  if (data.password && data.password.trim() !== '') {
    updateData.password = await bcrypt.hash(data.password, 10);
    updateData.refreshToken = null; // Invalidate active session so new password is required
  } else {
    delete updateData.password;
  }

  const staff = await prisma.staff.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, phone: true, blocked: true }
  });

  return sendResponse(res, 200, 'Staff member updated successfully', staff);
});

const resetStaffPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { password } = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long')
  }).parse(req.body);

  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Staff member not found');

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.staff.update({
    where: { id },
    data: {
      password: hashedPassword,
      refreshToken: null
    }
  });

  return sendResponse(res, 200, 'Staff member password reset successfully');
});

const deleteStaff = asyncHandler(async (req, res, next) => {
  await prisma.staff.delete({ where: { id: req.params.id } });
  return sendResponse(res, 200, 'Staff member deleted successfully');
});

const getPayments = asyncHandler(async (req, res, next) => {
  const payments = await prisma.payment.findMany({
    include: {
      registration: {
        select: {
          fullName: true,
          phoneNumber: true,
          collegeName: true,
          department: true,
          semester: true,
          student: { select: { id: true, name: true, rollNo: true, email: true, phone: true } },
          event: { select: { id: true, title: true } }
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
          student: { select: { name: true, rollNo: true, email: true, phone: true } },
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

/**
 * Clean cell values by removing surrounding quotes and whitespace
 */
const cleanVal = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/^['"]|['"]$/g, '').trim();
};

/**
 * Helper to normalize and extract fields from various CSV formats (Paytm / Technoplanet)
 */
const normalizePaymentRow = (row) => {
  if (!row || typeof row !== 'object') return null;

  // 1. Student Name
  const studentName = cleanVal(
    row.studentName ||
    row['NAME OF TEAM LEADER/INDIVIDUAL'] ||
    row['NAME OF TEAM LEADER'] ||
    row['Student Name'] ||
    row['student_name'] ||
    row['Name'] ||
    row['name'] ||
    row['AccountName'] ||
    row['Customer Name']
  );

  // 2. Email
  const email = cleanVal(
    row.email ||
    row['Email ID'] ||
    row['Email'] ||
    row['userEmail'] ||
    row['email_id'] ||
    row['Customer Email'] ||
    row['STUDENT EMAIL']
  ).toLowerCase();

  // 3. WhatsApp / Phone
  const rawPhone = cleanVal(
    row.whatsappNumber ||
    row.phone ||
    row['WhatsApp Number'] ||
    row['WhatsApp'] ||
    row['Phone No'] ||
    row['Phone'] ||
    row['userMobile'] ||
    row['Mobile'] ||
    row['mobileNumber']
  );
  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

  // 4. Event Name
  let eventName = cleanVal(
    row.eventName ||
    row['Event Name'] ||
    row['event_name'] ||
    row['EVENT'] ||
    row['Event'] ||
    row['Events'] ||
    row['Event Title']
  );

  if (!eventName) {
    // Scan for any column containing 'selected value'
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('selected value') || key.toLowerCase().includes('selected_value')) {
        const val = cleanVal(row[key]);
        if (val) {
          eventName = val;
          break;
        }
      }
    }
  }

  // If still not found, check payment columns with amount > 0 (e.g. "TREASURE HUNT.TREASURE HUNT payment amount")
  if (!eventName) {
    for (const [key, val] of Object.entries(row)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('payment amount') || lowerKey.includes('amount')) {
        const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        if (num > 0) {
          const parts = key.split('.');
          eventName = cleanVal(parts[0]);
          break;
        }
      }
    }
  }

  if (!eventName) {
    eventName = 'Technoplanet Event';
  }

  // 5. Amount
  let rawAmount = cleanVal(
    row.amount ||
    row['TxnAmount'] ||
    row['TXN_AMOUNT'] ||
    row['TOTAL_AMOUNT'] ||
    row['BASE_AMOUNT'] ||
    row['Amount'] ||
    row['amount'] ||
    row['SettledAmt']
  );
  if (!rawAmount) {
    for (const [key, val] of Object.entries(row)) {
      if (key.toLowerCase().includes('payment amount')) {
        const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        if (num > 0) {
          rawAmount = String(num);
          break;
        }
      }
    }
  }
  const amount = parseFloat(rawAmount.replace(/[^0-9.]/g, '')) || 0;

  // 6. Payment Date
  const rawDate = cleanVal(
    row.paymentDate ||
    row['TxnDate'] ||
    row['TXN_DATE_STR'] ||
    row['Payment Date'] ||
    row['payment_date'] ||
    row['SettledDate'] ||
    row['UPDATED_ON'] ||
    row['Date']
  );
  let paymentDate = new Date();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      paymentDate = parsed;
    }
  }

  // 7. Transaction ID
  const transactionId = cleanVal(
    row.transactionId ||
    row['TXN_ID'] ||
    row['TxnId'] ||
    row['Paytm TxnId'] ||
    row['BankTxnID'] ||
    row['OrderId'] ||
    row['REF_TXN_ID'] ||
    row['PRN']
  );

  // 8. Academic / College Details
  const course = cleanVal(
    row.course ||
    row['COURSE NAME'] ||
    row['Course'] ||
    row['Department'] ||
    row['Branch']
  );
  const semesterStr = cleanVal(
    row.semester ||
    row['SEMESTER'] ||
    row['Semester']
  );
  const semNumber = parseInt(semesterStr.replace(/\D/g, ''), 10) || 1;

  const institute = cleanVal(
    row.institute ||
    row['NAME OF INSTITUTE'] ||
    row['Institute'] ||
    row['College'] ||
    row['collegeName']
  );

  // 9. Team members
  const teamMembers = [];
  ['TEAM MEMBER 2', 'TEAM MEMBER 3', 'TEAM MEMBER 4'].forEach((mKey) => {
    const m = cleanVal(row[mKey]);
    if (m) teamMembers.push(m);
  });

  return {
    studentName: studentName || 'Participant',
    email: email || '',
    whatsappNumber: cleanPhone || '',
    eventName,
    amount,
    paymentDate,
    transactionId: transactionId || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    course: course || 'General',
    semester: semesterStr || `${semNumber}`,
    semNumber,
    institute: institute || 'RK University',
    teamMembers
  };
};

/**
 * @desc Import CSV / Sheet payment transactions into database Payment table
 * @route POST /api/admin/payments/import
 */
const importPayments = asyncHandler(async (req, res, next) => {
  const { records } = req.body;

  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new BadRequestError('Records array is required and cannot be empty');
  }

  // Ensure a default category exists for auto-creating unknown events
  let defaultCategory = await prisma.category.findFirst();
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Technical',
        description: 'Default category for imported technical events'
      }
    });
  }

  // Ensure default staff / admin coordinator exists
  let defaultStaff = await prisma.staff.findFirst({ where: { role: 'ADMIN' } });
  if (!defaultStaff) {
    defaultStaff = await prisma.staff.findFirst();
  }

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let totalAmount = 0;
  const errors = [];
  const processedPayments = [];

  // Default hashed password for auto-created students: Rku@1234
  const defaultPasswordHash = await bcrypt.hash('Rku@1234', 10);

  for (let i = 0; i < records.length; i++) {
    const rawRow = records[i];
    try {
      const normalized = normalizePaymentRow(rawRow);
      if (!normalized) {
        skippedCount++;
        continue;
      }

      const {
        studentName,
        email,
        whatsappNumber,
        eventName,
        amount,
        paymentDate,
        transactionId,
        course,
        semester,
        semNumber,
        institute,
        teamMembers
      } = normalized;

      // 1. Resolve Student: find by email or phone
      let student = null;
      if (email) {
        student = await prisma.student.findUnique({ where: { email } });
      }
      if (!student && whatsappNumber) {
        student = await prisma.student.findFirst({
          where: { phone: { contains: whatsappNumber } }
        });
      }

      // If student not found, create new Student
      if (!student) {
        const studentEmail = email || `${whatsappNumber || Date.now()}@student.techno.rku.ac.in`;
        // Generate unique roll number
        let rollNo = `RKU-${whatsappNumber ? whatsappNumber.slice(-6) : Math.floor(100000 + Math.random() * 900000)}`;
        const existingRoll = await prisma.student.findUnique({ where: { rollNo } });
        if (existingRoll) {
          rollNo = `${rollNo}-${Math.floor(Math.random() * 900 + 100)}`;
        }

        student = await prisma.student.create({
          data: {
            name: studentName,
            email: studentEmail,
            phone: whatsappNumber || null,
            rollNo,
            department: course || 'General',
            semester: semNumber,
            password: defaultPasswordHash,
            isEmailVerified: true
          }
        });
      } else {
        // Update missing phone if available
        if (!student.phone && whatsappNumber) {
          student = await prisma.student.update({
            where: { id: student.id },
            data: { phone: whatsappNumber }
          });
        }
      }

      // 2. Resolve Event: match title case-insensitively or contains core name
      const cleanTitle = eventName.trim();
      const coreName = cleanTitle.replace(/\(.*?\)/g, '').trim();

      let event = await prisma.event.findFirst({
        where: {
          OR: [
            { title: { equals: cleanTitle } },
            { title: { contains: coreName } }
          ]
        }
      });

      // Auto-create event if not found
      if (!event) {
        event = await prisma.event.create({
          data: {
            title: cleanTitle,
            description: `Imported event for ${cleanTitle}`,
            categoryId: defaultCategory.id,
            coordinatorId: defaultStaff ? defaultStaff.id : 'unknown',
            date: paymentDate || new Date(),
            time: '10:00 AM',
            venue: 'RK University Campus',
            maxParticipants: 200,
            registrationFee: amount || 0,
            registrationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          }
        });
      }

      // 3. Resolve Registration: find or create for [studentId, eventId]
      let registration = await prisma.registration.findUnique({
        where: {
          studentId_eventId: {
            studentId: student.id,
            eventId: event.id
          }
        }
      });

      const qrCodePass = `PASS-${student.id.slice(0, 5)}-${event.id.slice(0, 5)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      if (!registration) {
        registration = await prisma.registration.create({
          data: {
            studentId: student.id,
            eventId: event.id,
            status: 'REGISTERED',
            attendance: 'NOT_MARKED',
            qrCodePass,
            fullName: studentName,
            phoneNumber: whatsappNumber || student.phone,
            collegeName: institute,
            department: course,
            branch: course,
            semester,
            isTeam: teamMembers.length > 0,
            teamMembers: teamMembers.length > 0 ? teamMembers : null
          }
        });
      } else if (registration.status !== 'REGISTERED') {
        registration = await prisma.registration.update({
          where: { id: registration.id },
          data: { status: 'REGISTERED' }
        });
      }

      // 4. Resolve Payment: upsert by transactionId or registrationId
      let existingPayment = null;
      if (transactionId) {
        existingPayment = await prisma.payment.findUnique({
          where: { transactionId }
        });
      }
      if (!existingPayment) {
        existingPayment = await prisma.payment.findUnique({
          where: { registrationId: registration.id }
        });
      }

      let savedPayment = null;
      if (existingPayment) {
        savedPayment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount,
            status: 'SUCCESS',
            transactionId: transactionId || existingPayment.transactionId,
            paymentMethod: 'Paytm CSV Import',
            paymentDate
          },
          include: {
            registration: {
              select: {
                fullName: true,
                phoneNumber: true,
                student: { select: { name: true, rollNo: true, email: true, phone: true } },
                event: { select: { title: true } }
              }
            }
          }
        });
        updatedCount++;
      } else {
        savedPayment = await prisma.payment.create({
          data: {
            registrationId: registration.id,
            amount,
            status: 'SUCCESS',
            transactionId,
            paymentMethod: 'Paytm CSV Import',
            paymentDate
          },
          include: {
            registration: {
              select: {
                fullName: true,
                phoneNumber: true,
                student: { select: { name: true, rollNo: true, email: true, phone: true } },
                event: { select: { title: true } }
              }
            }
          }
        });
        importedCount++;
      }

      totalAmount += amount;
      processedPayments.push(savedPayment);
    } catch (rowError) {
      console.error(`[CSV Import] Error at row ${i}:`, rowError.message);
      errors.push({ row: i + 1, error: rowError.message });
      skippedCount++;
    }
  }

  // Create audit activity log
  await prisma.activityLog.create({
    data: {
      userId: req.user?.id || 'admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'PAYMENT_CSV_IMPORT',
      details: `CSV import completed: ${importedCount} created, ${updatedCount} updated, ${skippedCount} skipped/failed. Total amount ₹${totalAmount}.`
    }
  }).catch((err) => console.error('[ActivityLog error]:', err.message));

  return sendResponse(res, 200, `Successfully imported ${importedCount + updatedCount} payment transactions`, {
    importedCount,
    updatedCount,
    skippedCount,
    totalAmount,
    errors,
    payments: processedPayments
  });
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
  resetStaffPassword,
  deleteStaff,
  getPayments,
  getPaymentById,
  refundPayment,
  importPayments,
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
