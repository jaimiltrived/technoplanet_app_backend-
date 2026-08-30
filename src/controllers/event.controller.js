import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';


const getEvents = asyncHandler(async (req, res, next) => {
  const { categoryId, status, search, coordinatorId } = req.query;

  const whereClause = {};

  if (categoryId) {
    whereClause.categoryId = String(categoryId);
  }

  if (coordinatorId) {
    whereClause.coordinatorId = String(coordinatorId);
  }

  if (status === 'upcoming') {
    whereClause.date = { gt: new Date() };
    whereClause.isCompleted = false;
  } else if (status === 'ongoing') {
    const now = new Date();
    whereClause.isCompleted = false;
    whereClause.AND = [
      { date: { lte: now } },
      { registrationDeadline: { gte: now } }
    ];
  } else if (status === 'completed') {
    whereClause.isCompleted = true;
  }

  if (search) {
    const cleanSearch = String(search).trim().slice(0, 100);
    whereClause.OR = [
      { title: { contains: cleanSearch } },
      { description: { contains: cleanSearch } },
      { venue: { contains: cleanSearch } }
    ];
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    include: {
      category: {
        select: { name: true }
      },
      coordinator: {
        select: { id: true, name: true, email: true }
      },
      registrations: {
        where: { status: { not: 'CANCELLED' } },
        select: { id: true, status: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  return sendResponse(res, 200, 'Events retrieved successfully', events);
});

/**
 * @desc Get single event details
 * @route GET /api/events/:id
 */
const getEventById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      category: true,
      coordinator: {
        select: { id: true, name: true, email: true, phone: true }
      },
      volunteers: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  return sendResponse(res, 200, 'Event details retrieved successfully', event);
});

/**
 * @desc Get events by category
 * @route GET /api/events/category/:categoryId
 */
const getEventsByCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;

  const events = await prisma.event.findMany({
    where: { categoryId },
    include: {
      category: { select: { name: true } }
    }
  });

  return sendResponse(res, 200, 'Events by category retrieved successfully', events);
});

/**
 * @desc Search events
 * @route GET /api/events/search
 */
const searchEvents = asyncHandler(async (req, res, next) => {
  const q = req.query.q || req.query.search;
  if (!q) {
    throw new BadRequestError('Search query is required');
  }

  const cleanQ = String(q).trim().slice(0, 100);

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { title: { contains: cleanQ } },
        { description: { contains: cleanQ } }
      ]
    },
    include: {
      category: { select: { name: true } }
    }
  });

  return sendResponse(res, 200, 'Events search completed', events);
});

/**
 * @desc Register for an event
 * @route POST /api/events/register
 */
const registerForEvent = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can register for events');
  }

  const { 
    eventId, 
    fullName, 
    enrollmentNumber, 
    collegeName, 
    department, 
    branch, 
    semester, 
    phoneNumber 
  } = z.object({ 
    eventId: z.string(),
    fullName: z.string().optional(),
    enrollmentNumber: z.string().optional(),
    collegeName: z.string().optional(),
    department: z.string().optional(),
    branch: z.string().optional(),
    semester: z.string().optional(),
    phoneNumber: z.string().optional()
  }).parse(req.body);
  const studentId = req.user.id;

  // 1. Fetch event details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { registrations: true }
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  // 2. Check if deadline has passed
  if (new Date() > event.registrationDeadline) {
    throw new BadRequestError('Registration deadline has passed for this event');
  }

  // 3. Check capacity
  const activeRegistrations = event.registrations.filter(r => r.status !== 'CANCELLED');
  if (activeRegistrations.length >= event.maxParticipants) {
    throw new BadRequestError('Event has reached its maximum capacity');
  }

  // 4. Check if student already registered
  const existingReg = await prisma.registration.findUnique({
    where: {
      studentId_eventId: { studentId, eventId }
    }
  });

  if (existingReg && existingReg.status !== 'CANCELLED') {
    throw new ConflictError('You are already registered for this event');
  }

  // 5. Generate QR Code Pass token
  const qrCodePass = `PASS-${studentId.substring(0, 8)}-${eventId.substring(0, 8)}-${Date.now()}`;

  // If there's an existing cancelled registration, re-activate it; else create new
  let registration;
  const registrationFee = Number(event.registrationFee);

  if (existingReg) {
    registration = await prisma.registration.update({
      where: { id: existingReg.id },
      data: {
        status: registrationFee > 0 ? 'PENDING' : 'REGISTERED',
        qrCodePass,
        registrationDate: new Date(),
        fullName,
        enrollmentNumber,
        collegeName,
        department,
        branch,
        semester,
        phoneNumber
      }
    });
  } else {
    registration = await prisma.registration.create({
      data: {
        studentId,
        eventId,
        qrCodePass,
        status: registrationFee > 0 ? 'PENDING' : 'REGISTERED',
        fullName,
        enrollmentNumber,
        collegeName,
        department,
        branch,
        semester,
        phoneNumber
      }
    });
  }

  // 6. Create pending payment order if registration fee > 0
  let paymentDetails = null;
  if (registrationFee > 0) {
    paymentDetails = await prisma.payment.create({
      data: {
        registrationId: registration.id,
        amount: registrationFee,
        status: 'PENDING'
      }
    });
  }

  return sendResponse(res, 201, registrationFee > 0 ? 'Registration initiated. Payment pending.' : 'Registered successfully for the event', {
    registrationId: registration.id,
    status: registration.status,
    qrCodePass: registration.qrCodePass,
    fee: registrationFee,
    payment: paymentDetails
  });
});

/**
 * @desc Cancel registration (before deadline)
 * @route DELETE /api/events/register/:id (here id is registrationId or eventId? The endpoint says :id. Let's make it eventId or registrationId. Let's support registrationId)
 */
const cancelRegistration = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can cancel registration');
  }

  const { id: registrationId } = req.params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true }
  });

  if (!registration || registration.studentId !== req.user.id) {
    throw new NotFoundError('Registration record not found');
  }

  if (registration.status === 'CANCELLED') {
    throw new BadRequestError('Registration is already cancelled');
  }

  // Check if deadline has passed
  if (new Date() > registration.event.registrationDeadline) {
    throw new BadRequestError('Cannot cancel registration after the registration deadline');
  }

  // Update registration status to CANCELLED
  const updatedReg = await prisma.registration.update({
    where: { id: registrationId },
    data: { status: 'CANCELLED' }
  });

  // If there was a pending/success payment, we mark it failed or refunded
  await prisma.payment.updateMany({
    where: { registrationId },
    data: { status: 'FAILED' }
  });

  return sendResponse(res, 200, 'Registration cancelled successfully', updatedReg);
});

/**
 * @desc Get registered events for current student
 * @route GET /api/events/my-events
 */
const getMyEvents = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can fetch their events');
  }

  const registrations = await prisma.registration.findMany({
    where: { studentId: req.user.id, status: { not: 'CANCELLED' } },
    include: {
      event: {
        include: {
          category: { select: { name: true } }
        }
      },
      payment: true
    },
    orderBy: { registrationDate: 'desc' }
  });

  return sendResponse(res, 200, 'My events retrieved successfully', registrations);
});

/**
 * @desc Get upcoming events
 * @route GET /api/events/upcoming
 */
const getUpcomingEvents = asyncHandler(async (req, res, next) => {
  const events = await prisma.event.findMany({
    where: {
      date: { gt: new Date() }
    },
    include: {
      category: { select: { name: true } }
    },
    orderBy: { date: 'asc' }
  });

  return sendResponse(res, 200, 'Upcoming events retrieved successfully', events);
});

/**
 * @desc Get completed events
 * @route GET /api/events/completed
 */
const getCompletedEvents = asyncHandler(async (req, res, next) => {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { isCompleted: true },
        { date: { lt: new Date() } }
      ]
    },
    include: {
      category: { select: { name: true } }
    },
    orderBy: { date: 'desc' }
  });

  return sendResponse(res, 200, 'Completed events retrieved successfully', events);
});

export {
  getEvents,
  getEventById,
  getEventsByCategory,
  searchEvents,
  registerForEvent,
  cancelRegistration,
  getMyEvents,
  getUpcomingEvents,
  getCompletedEvents
};
