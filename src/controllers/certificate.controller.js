import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get all certificates earned by the student
 * @route GET /api/certificates
 */
const getCertificates = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can retrieve certificates');
  }

  const certificates = await prisma.score.findMany({
    where: {
      studentId: req.user.id,
      certificateUrl: { not: null }
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

  return sendResponse(res, 200, 'Certificates retrieved successfully', certificates);
});

/**
 * @desc Get certificate download link/details
 * @route GET /api/certificates/:id/download
 */
const downloadCertificate = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // Here id is scoreId containing the certificate

  const score = await prisma.score.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, rollNo: true } },
      event: { select: { title: true, date: true } }
    }
  });

  if (!score || !score.certificateUrl) {
    throw new NotFoundError('Certificate not found');
  }

  // Verification: Only owner student or staff can download it
  if (req.user && req.user.role === 'STUDENT' && score.studentId !== req.user.id) {
    throw new BadRequestError('You are not authorized to download this certificate');
  }

  return sendResponse(res, 200, 'Certificate retrieved successfully', {
    scoreId: score.id,
    studentName: score.student.name,
    rollNo: score.student.rollNo,
    eventTitle: score.event.title,
    eventDate: score.event.date,
    rank: score.rank,
    downloadUrl: score.certificateUrl
  });
});

export {
  getCertificates,
  downloadCertificate
};
