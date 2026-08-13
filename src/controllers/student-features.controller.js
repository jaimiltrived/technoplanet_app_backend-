import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get student dashboard metrics (registered events, next event countdown, recent notifications)
 * @route GET /api/student/dashboard
 */
const getDashboard = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can access this dashboard');
  }

  const studentId = req.user.id;

  // 1. Get total active registrations
  const registrationsCount = await prisma.registration.count({
    where: { studentId, status: 'REGISTERED' }
  });

  // 2. Find next upcoming registered event
  const nextRegistration = await prisma.registration.findFirst({
    where: {
      studentId,
      status: 'REGISTERED',
      event: { date: { gt: new Date() } }
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          time: true,
          venue: true
        }
      }
    },
    orderBy: {
      event: { date: 'asc' }
    }
  });

  // 3. Find recent announcements (system-wide or related to student's registered events)
  const registeredEventIds = await prisma.registration.findMany({
    where: { studentId, status: 'REGISTERED' },
    select: { eventId: true }
  }).then(regs => regs.map(r => r.eventId));

  const recentAnnouncements = await prisma.announcement.findMany({
    where: {
      OR: [
        { eventId: null }, // System-wide
        { eventId: { in: registeredEventIds } } // Event-specific
      ]
    },
    include: {
      event: { select: { title: true } },
      sentBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return sendResponse(res, 200, 'Student dashboard retrieved successfully', {
    statistics: {
      registeredEventsCount: registrationsCount,
    },
    nextEvent: nextRegistration ? nextRegistration.event : null,
    recentAnnouncements
  });
});

/**
 * @desc Get notifications (announcements) for the student
 * @route GET /api/student/notifications
 */
const getNotifications = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can fetch notifications');
  }

  const studentId = req.user.id;

  const registeredEventIds = await prisma.registration.findMany({
    where: { studentId, status: 'REGISTERED' },
    select: { eventId: true }
  }).then(regs => regs.map(r => r.eventId));

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { eventId: null },
        { eventId: { in: registeredEventIds } }
      ]
    },
    include: {
      event: { select: { title: true } },
      sentBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Notifications retrieved successfully', announcements);
});

/**
 * @desc Get personal event-wise scores
 * @route GET /api/student/scores
 */
const getScores = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can view their scores');
  }

  const scores = await prisma.score.findMany({
    where: { studentId: req.user.id },
    include: {
      event: {
        select: {
          title: true,
          date: true,
          rankingsDeclared: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Scores retrieved successfully', scores);
});

/**
 * @desc Get score details for a specific event
 * @route GET /api/student/scores/:eventId
 */
const getScoreByEvent = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can view their scores');
  }

  const { eventId } = req.params;

  const score = await prisma.score.findUnique({
    where: {
      eventId_studentId: {
        eventId,
        studentId: req.user.id
      }
    },
    include: {
      event: {
        select: {
          title: true,
          date: true
        }
      }
    }
  });

  if (!score) {
    throw new NotFoundError('No score recorded for this event');
  }

  return sendResponse(res, 200, 'Event score retrieved successfully', score);
});

/**
 * @desc Get rank in a specific event
 * @route GET /api/student/rank/:eventId
 */
const getRankByEvent = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can check rankings');
  }

  const { eventId } = req.params;

  const score = await prisma.score.findUnique({
    where: {
      eventId_studentId: {
        eventId,
        studentId: req.user.id
      }
    },
    select: {
      points: true,
      rank: true
    }
  });

  if (!score) {
    throw new NotFoundError('No score/rank data found for this event');
  }

  return sendResponse(res, 200, 'Event rank retrieved successfully', {
    points: score.points,
    rank: score.rank || 'Declaring soon'
  });
});

/**
 * @desc Get event leaderboard
 * @route GET /api/student/leaderboard/:eventId
 */
const getLeaderboardByEvent = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  // Verify event exists and rankings are declared
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const leaderboard = await prisma.score.findMany({
    where: { eventId },
    include: {
      student: {
        select: {
          name: true,
          rollNo: true,
          department: true
        }
      }
    },
    orderBy: [
      { points: 'desc' },
      { rank: 'asc' }
    ]
  });

  return sendResponse(res, 200, 'Leaderboard retrieved successfully', {
    eventTitle: event.title,
    rankingsDeclared: event.rankingsDeclared,
    leaderboard
  });
});

export {
  getDashboard,
  getNotifications,
  getScores,
  getScoreByEvent,
  getRankByEvent,
  getLeaderboardByEvent
};
