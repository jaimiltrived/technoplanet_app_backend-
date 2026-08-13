import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

// Helper to check if volunteer is assigned to event
const checkVolunteerAssignment = async (eventId, volunteerId) => {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      volunteers: {
        some: { id: volunteerId }
      }
    }
  });

  if (!event) {
    throw new ForbiddenError('Access Denied: You are not assigned volunteer/coordinator to this event');
  }

  return event;
};

/**
 * @desc Get coordinator/volunteer dashboard
 * @route GET /api/coordinator/dashboard
 */
const getCoordinatorDashboard = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'VOLUNTEER') {
    throw new ForbiddenError('Access denied: Volunteer role required');
  }

  const volunteerId = req.user.id;

  const eventsCount = await prisma.event.count({
    where: {
      volunteers: { some: { id: volunteerId } }
    }
  });

  const nextVolunteeredEvent = await prisma.event.findFirst({
    where: {
      volunteers: { some: { id: volunteerId } },
      date: { gt: new Date() }
    },
    orderBy: { date: 'asc' }
  });

  return sendResponse(res, 200, 'Volunteer dashboard retrieved successfully', {
    assignedEventsCount: eventsCount,
    nextVolunteeredEvent
  });
});

/**
 * @desc View events volunteered for
 * @route GET /api/coordinator/events
 */
const getCoordinatorEvents = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'VOLUNTEER') {
    throw new ForbiddenError('Access denied: Volunteer role required');
  }

  const events = await prisma.event.findMany({
    where: {
      volunteers: {
        some: { id: req.user.id }
      }
    },
    include: {
      category: { select: { name: true } },
      coordinator: { select: { name: true, email: true } }
    },
    orderBy: { date: 'asc' }
  });

  return sendResponse(res, 200, 'Volunteered events list retrieved successfully', events);
});

/**
 * @desc View participant list for an assigned event
 * @route GET /api/coordinator/participants
 */
const getCoordinatorParticipants = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'VOLUNTEER') {
    throw new ForbiddenError('Access denied');
  }

  const { eventId } = req.query;
  if (!eventId) {
    throw new ForbiddenError('eventId query parameter is required');
  }

  await checkVolunteerAssignment(String(eventId), req.user.id);

  const participants = await prisma.registration.findMany({
    where: { eventId: String(eventId), status: 'REGISTERED' },
    include: {
      student: {
        select: { name: true, rollNo: true, department: true }
      }
    },
    orderBy: { student: { rollNo: 'asc' } }
  });

  return sendResponse(res, 200, 'Participant list retrieved successfully', participants);
});

/**
 * @desc View attendance list for volunteered event
 * @route GET /api/coordinator/attendance
 */
const getCoordinatorAttendance = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'VOLUNTEER') {
    throw new ForbiddenError('Access denied');
  }

  const { eventId } = req.query;
  if (!eventId) {
    throw new ForbiddenError('eventId query parameter is required');
  }

  await checkVolunteerAssignment(String(eventId), req.user.id);

  const attendance = await prisma.registration.findMany({
    where: { eventId: String(eventId), status: 'REGISTERED' },
    select: {
      id: true,
      attendance: true,
      student: { select: { name: true, rollNo: true } }
    }
  });

  return sendResponse(res, 200, 'Attendance roster retrieved successfully', attendance);
});

/**
 * @desc View announcements for volunteered event
 * @route GET /api/coordinator/announcements
 */
const getCoordinatorAnnouncements = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'VOLUNTEER') {
    throw new ForbiddenError('Access denied');
  }

  const { eventId } = req.query;
  if (!eventId) {
    throw new ForbiddenError('eventId query parameter is required');
  }

  await checkVolunteerAssignment(String(eventId), req.user.id);

  const announcements = await prisma.announcement.findMany({
    where: { eventId: String(eventId) },
    include: {
      sentBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Announcements retrieved successfully', announcements);
});

export {
  getCoordinatorDashboard,
  getCoordinatorEvents,
  getCoordinatorParticipants,
  getCoordinatorAttendance,
  getCoordinatorAnnouncements
};
