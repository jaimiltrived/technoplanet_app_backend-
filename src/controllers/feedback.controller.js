import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';

/**
 * @desc Submit feedback for an event
 * @route POST /api/feedback
 */
const createFeedback = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can submit event feedback');
  }

  const schema = z.object({
    eventId: z.string(),
    message: z.string().min(3, 'Feedback must be at least 3 characters long'),
    rating: z.number().int().min(1).max(5)
  });

  const { eventId, message, rating } = schema.parse(req.body);
  const studentId = req.user.id;

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  // Check if student was registered for this event
  const registration = await prisma.registration.findUnique({
    where: {
      studentId_eventId: { studentId, eventId }
    }
  });

  if (!registration || registration.status !== 'REGISTERED') {
    throw new BadRequestError('You can only submit feedback for events you registered for');
  }

  // Create feedback
  const feedback = await prisma.feedback.create({
    data: {
      studentId,
      eventId,
      message,
      rating
    },
    include: {
      student: {
        select: { name: true, rollNo: true }
      }
    }
  });

  return sendResponse(res, 201, 'Feedback submitted successfully', feedback);
});

/**
 * @desc Retrieve feedback for an event
 * @route GET /api/feedback/:eventId
 */
const getEventFeedback = asyncHandler(async (req, res, next) => {
  const { eventId } = req.params;

  const feedbacks = await prisma.feedback.findMany({
    where: { eventId },
    include: {
      student: {
        select: { name: true, rollNo: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Event feedbacks retrieved successfully', feedbacks);
});

export {
  createFeedback,
  getEventFeedback
};
