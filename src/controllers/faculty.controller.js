import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';

// Helper to check if event belongs to coordinator
const checkEventOwnership = async (eventId, coordinatorId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (event.coordinatorId !== coordinatorId) {
    throw new ForbiddenError('You are not the assigned coordinator for this event');
  }

  return event;
};

/**
 * @desc Get faculty dashboard summary
 * @route GET /api/faculty/dashboard
 */
const getFacultyDashboard = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied: Faculty role required');
  }

  const coordinatorId = req.user.id;

  const assignedEventsCount = await prisma.event.count({
    where: { coordinatorId }
  });

  const upcomingEvents = await prisma.event.findMany({
    where: {
      coordinatorId,
      date: { gt: new Date() }
    },
    orderBy: { date: 'asc' },
    take: 5
  });

  const recentAnnouncements = await prisma.announcement.findMany({
    where: { sentById: coordinatorId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return sendResponse(res, 200, 'Faculty dashboard retrieved successfully', {
    assignedEventsCount,
    upcomingEvents,
    recentAnnouncements
  });
});

/**
 * @desc List events assigned to this faculty coordinator
 * @route GET /api/faculty/events
 */
const getAssignedEvents = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied: Faculty role required');
  }

  const events = await prisma.event.findMany({
    where: { coordinatorId: req.user.id },
    include: {
      category: { select: { name: true } },
      _count: {
        select: { registrations: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  return sendResponse(res, 200, 'Assigned events retrieved successfully', events);
});

/**
 * @desc Get single assigned event details
 * @route GET /api/faculty/events/:id
 */
const getAssignedEventById = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied');
  }

  const { id } = req.params;
  await checkEventOwnership(id, req.user.id);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      volunteers: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { registrations: true }
      }
    }
  });

  return sendResponse(res, 200, 'Assigned event details retrieved successfully', event);
});

/**
 * @desc List and search registered participants for an assigned event
 * @route GET /api/faculty/events/:eventId/participants
 */
const getEventParticipants = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied');
  }

  const { eventId } = req.params;
  const rawSearch = req.query.search;
  const search = rawSearch ? String(rawSearch).trim().slice(0, 100) : null;
  await checkEventOwnership(eventId, req.user.id);

  const searchFilter = search
    ? {
        student: {
          OR: [
            { name: { contains: search } },
            { rollNo: { contains: search } },
            { email: { contains: search } }
          ]
        }
      }
    : {};

  const participants = await prisma.registration.findMany({
    where: {
      eventId,
      ...searchFilter
    },
    include: {
      student: {
        select: { id: true, name: true, email: true, rollNo: true, department: true, semester: true }
      },
      payment: true
    },
    orderBy: { student: { name: 'asc' } }
  });

  return sendResponse(res, 200, 'Event participants list retrieved successfully', participants);
});

/**
 * @desc Fetch student check-in profile details by registration ID
 * @route GET /api/faculty/participant/:id
 */
const getParticipantById = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // registrationId

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, email: true, rollNo: true, department: true, semester: true, profilePic: true } },
      event: { select: { title: true, coordinatorId: true } },
      payment: true
    }
  });

  if (!registration) {
    throw new NotFoundError('Participant registration not found');
  }

  // Ensure faculty is the coordinator for this event
  if (req.user && req.user.role === 'FACULTY' && registration.event.coordinatorId !== req.user.id) {
    throw new ForbiddenError('Access Denied: You are not the coordinator for this event');
  }

  return sendResponse(res, 200, 'Participant details retrieved successfully', registration);
});

/**
 * @desc Scan QR Code to mark participant attendance
 * @route POST /api/faculty/attendance/scan
 */
const scanAttendance = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    eventId: z.string(),
    qrCodePass: z.string()
  });

  const { eventId, qrCodePass } = schema.parse(req.body);

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const registration = await prisma.registration.findFirst({
    where: { eventId, qrCodePass }
  });

  if (!registration) {
    throw new NotFoundError('Registration ticket not found for this event');
  }

  if (registration.status !== 'REGISTERED') {
    throw new BadRequestError(`Cannot mark attendance: Registration status is ${registration.status}`);
  }

  if (registration.attendance === 'PRESENT') {
    return sendResponse(res, 200, 'Attendance already marked PRESENT', registration);
  }

  const updatedReg = await prisma.registration.update({
    where: { id: registration.id },
    data: { attendance: 'PRESENT' }
  });

  return sendResponse(res, 200, 'Attendance marked PRESENT successfully via QR Scan', updatedReg);
});

/**
 * @desc Manually mark attendance
 * @route POST /api/faculty/attendance/manual
 */
const markAttendanceManual = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    eventId: z.string(),
    studentId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'NOT_MARKED'])
  });

  const { eventId, studentId, status } = schema.parse(req.body);

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const registration = await prisma.registration.findUnique({
    where: {
      studentId_eventId: { studentId, eventId }
    }
  });

  if (!registration) {
    throw new NotFoundError('Student is not registered for this event');
  }

  const updatedReg = await prisma.registration.update({
    where: { id: registration.id },
    data: { attendance: status }
  });

  return sendResponse(res, 200, `Attendance status updated manually to ${status}`, updatedReg);
});

/**
 * @desc Get attendance summary sheet for an event
 * @route GET /api/faculty/attendance/:eventId
 */
const getEventAttendanceList = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const list = await prisma.registration.findMany({
    where: { eventId, status: 'REGISTERED' },
    select: {
      id: true,
      attendance: true,
      registrationDate: true,
      student: {
        select: { name: true, rollNo: true, department: true }
      }
    },
    orderBy: { student: { rollNo: 'asc' } }
  });

  return sendResponse(res, 200, 'Attendance sheet retrieved successfully', list);
});

/**
 * @desc Enter student score for an event
 * @route POST /api/faculty/score
 */
const enterScore = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    eventId: z.string(),
    studentId: z.string(),
    points: z.number().min(0).max(100)
  });

  const { eventId, studentId, points } = schema.parse(req.body);

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  // Verify student attendance was PRESENT
  const registration = await prisma.registration.findUnique({
    where: { studentId_eventId: { studentId, eventId } }
  });

  if (!registration || registration.attendance !== 'PRESENT') {
    throw new BadRequestError('Cannot enter scores for a student who was absent or not checked in');
  }

  // Create or update score
  const score = await prisma.score.upsert({
    where: {
      eventId_studentId: { eventId, studentId }
    },
    update: { points },
    create: { eventId, studentId, points }
  });

  // Mark scoresEntered on Event
  await prisma.event.update({
    where: { id: eventId },
    data: { scoresEntered: true }
  });

  return sendResponse(res, 201, 'Score saved successfully', score);
});

/**
 * @desc Edit score by score ID
 * @route PUT /api/faculty/score/:id
 */
const editScore = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { points } = z.object({ points: z.number().min(0).max(100) }).parse(req.body);

  const existingScore = await prisma.score.findUnique({
    where: { id },
    include: { event: true }
  });

  if (!existingScore) {
    throw new NotFoundError('Score record not found');
  }

  if (req.user && req.user.role === 'FACULTY' && existingScore.event.coordinatorId !== req.user.id) {
    throw new ForbiddenError('Access Denied: You are not the coordinator for this event');
  }

  const updatedScore = await prisma.score.update({
    where: { id },
    data: { points }
  });

  return sendResponse(res, 200, 'Score updated successfully', updatedScore);
});

/**
 * @desc View scores entered for an event
 * @route GET /api/faculty/score/:eventId
 */
const getEventScores = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const scores = await prisma.score.findMany({
    where: { eventId },
    include: {
      student: {
        select: { name: true, rollNo: true, department: true }
      }
    },
    orderBy: { points: 'desc' }
  });

  return sendResponse(res, 200, 'Event scores list retrieved successfully', scores);
});

/**
 * @desc Declare event rankings (automates rank assignments based on points desc)
 * @route POST /api/faculty/declare-rank
 */
const declareRankings = asyncHandler(async (req, res, next) => {
  const { eventId } = z.object({ eventId: z.string() }).parse(req.body);

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const scores = await prisma.score.findMany({
    where: { eventId },
    orderBy: { points: 'desc' }
  });

  if (scores.length === 0) {
    throw new BadRequestError('Cannot declare rankings: No student scores entered yet');
  }

  // Update rankings (e.g. 1st, 2nd, 3rd, and so on)
  const updatePromises = scores.map((score, index) => {
    return prisma.score.update({
      where: { id: score.id },
      data: { rank: index + 1 }
    });
  });

  await Promise.all(updatePromises);

  // Mark rankingsDeclared on Event
  await prisma.event.update({
    where: { id: eventId },
    data: { rankingsDeclared: true }
  });

  return sendResponse(res, 200, 'Event rankings calculated and declared successfully');
});

/**
 * @desc Get rankings list for an event
 * @route GET /api/faculty/rank/:eventId
 */
const getEventRankings = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  const rankings = await prisma.score.findMany({
    where: { eventId, rank: { not: null } },
    include: {
      student: {
        select: { name: true, rollNo: true, department: true }
      }
    },
    orderBy: { rank: 'asc' }
  });

  return sendResponse(res, 200, 'Event rankings retrieved successfully', rankings);
});

/**
 * @desc Assign Volunteer (Staff) to Event
 * @route POST /api/faculty/volunteer
 */
const assignVolunteer = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    eventId: z.string(),
    volunteerId: z.string()
  });

  const { eventId, volunteerId } = schema.parse(req.body);

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(eventId, req.user.id);
  }

  // Verify volunteer exists and has role VOLUNTEER or FACULTY
  const volunteer = await prisma.staff.findUnique({
    where: { id: volunteerId }
  });

  if (!volunteer) {
    throw new NotFoundError('Volunteer staff not found');
  }

  // Assign via connect in Prisma relation
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      volunteers: {
        connect: { id: volunteerId }
      }
    },
    include: {
      volunteers: { select: { id: true, name: true, email: true } }
    }
  });

  return sendResponse(res, 200, 'Volunteer assigned to event successfully', updatedEvent);
});

/**
 * @desc Remove Volunteer from Event
 * @route DELETE /api/faculty/volunteer/:id (volunteerId is in params, eventId in query/body. Let's make it eventId parameter in query)
 */
const removeVolunteer = asyncHandler(async (req, res, next) => {
  const volunteerId = req.params.id;
  const { eventId } = req.query;

  if (!eventId) {
    throw new BadRequestError('eventId query parameter is required');
  }

  if (req.user && req.user.role === 'FACULTY') {
    await checkEventOwnership(String(eventId), req.user.id);
  }

  await prisma.event.update({
    where: { id: String(eventId) },
    data: {
      volunteers: {
        disconnect: { id: volunteerId }
      }
    }
  });

  return sendResponse(res, 200, 'Volunteer removed from event successfully');
});

/**
 * @desc Get list of all staff with role VOLUNTEER
 * @route GET /api/faculty/volunteer
 */
const getVolunteersList = asyncHandler(async (req, res, next) => {
  const volunteers = await prisma.staff.findMany({
    where: { role: 'VOLUNTEER' },
    select: { id: true, name: true, email: true, phone: true }
  });

  return sendResponse(res, 200, 'Volunteers list retrieved successfully', volunteers);
});

/**
 * @desc Get list of all staff with role FACULTY
 * @route GET /api/faculty/coordinator (or coordinators list)
 */
const getFacultyList = asyncHandler(async (req, res, next) => {
  const faculty = await prisma.staff.findMany({
    where: { role: 'FACULTY' },
    select: { id: true, name: true, email: true, phone: true }
  });

  return sendResponse(res, 200, 'Faculty coordinators list retrieved successfully', faculty);
});

/**
 * @desc Get payment history for coordinator's assigned events
 * @route GET /api/faculty/payment-history
 */
const getAssignedEventPayments = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied');
  }

  const coordinatorId = req.user.id;

  const payments = await prisma.payment.findMany({
    where: {
      registration: {
        event: { coordinatorId }
      }
    },
    include: {
      registration: {
        select: {
          id: true,
          student: { select: { name: true, rollNo: true } },
          event: { select: { title: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Payments for assigned events retrieved successfully', payments);
});

/**
 * @desc Export report statistics
 * @route GET /api/faculty/report
 */
const getFacultyReport = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'FACULTY') {
    throw new ForbiddenError('Access denied');
  }

  const coordinatorId = req.user.id;

  // Total events
  const totalEvents = await prisma.event.count({ where: { coordinatorId } });

  // Total registrations
  const totalRegistrations = await prisma.registration.count({
    where: { event: { coordinatorId } }
  });

  // Attendance stats
  const presentCount = await prisma.registration.count({
    where: { event: { coordinatorId }, attendance: 'PRESENT' }
  });

  // Revenue stats
  const successfulPayments = await prisma.payment.findMany({
    where: {
      status: 'SUCCESS',
      registration: { event: { coordinatorId } }
    },
    select: { amount: true }
  });

  const totalRevenue = successfulPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return sendResponse(res, 200, 'Faculty event report generated successfully', {
    totalEvents,
    totalRegistrations,
    attendanceRate: totalRegistrations > 0 ? (presentCount / totalRegistrations) * 100 : 0,
    totalRevenue
  });
});

export {
  getFacultyDashboard,
  getAssignedEvents,
  getAssignedEventById,
  getEventParticipants,
  getParticipantById,
  scanAttendance,
  markAttendanceManual,
  getEventAttendanceList,
  enterScore,
  editScore,
  getEventScores,
  declareRankings,
  getEventRankings,
  assignVolunteer,
  removeVolunteer,
  getVolunteersList,
  getFacultyList,
  getAssignedEventPayments,
  getFacultyReport
};
