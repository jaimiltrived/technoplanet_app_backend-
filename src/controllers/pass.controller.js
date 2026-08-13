import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get details of an event pass (registration ticket)
 * @route GET /api/event-pass/:registrationId
 */
const getEventPass = asyncHandler(async (req, res, next) => {
  const { registrationId } = req.params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      student: {
        select: { id: true, name: true, email: true, rollNo: true, department: true }
      },
      event: {
        select: { id: true, title: true, date: true, time: true, venue: true, registrationFee: true }
      },
      payment: true
    }
  });

  if (!registration) {
    throw new NotFoundError('Event pass not found');
  }

  // Authorization check: Only owner student or staff members can view the pass
  const isOwner = req.user && req.user.role === 'STUDENT' && registration.studentId === req.user.id;
  const isStaff = req.user && ['ADMIN', 'FACULTY', 'VOLUNTEER'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    throw new ForbiddenError('You are not authorized to view this event pass');
  }

  return sendResponse(res, 200, 'Event pass details retrieved successfully', registration);
});

/**
 * @desc Retrieve raw QR Code text for drawing QR
 * @route GET /api/event-qr/:registrationId
 */
const getEventQr = asyncHandler(async (req, res, next) => {
  const { registrationId } = req.params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      studentId: true,
      qrCodePass: true,
      status: true
    }
  });

  if (!registration) {
    throw new NotFoundError('Event pass not found');
  }

  // Authorization check
  const isOwner = req.user && req.user.role === 'STUDENT' && registration.studentId === req.user.id;
  const isStaff = req.user && ['ADMIN', 'FACULTY', 'VOLUNTEER'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    throw new ForbiddenError('You are not authorized to access this QR code');
  }

  return sendResponse(res, 200, 'QR pass data retrieved successfully', {
    registrationId: registration.id,
    qrCodePass: registration.qrCodePass,
    status: registration.status
  });
});

export {
  getEventPass,
  getEventQr
};
