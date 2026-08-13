import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get authenticated student's profile details
 * @route GET /api/v1/student/profile
 */
const getStudentProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new NotFoundError('User context not found');
  }

  const student = await prisma.student.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      rollNo: true,
      department: true,
      semester: true,
      profilePic: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!student) {
    throw new NotFoundError('Student profile not found');
  }

  return sendResponse(res, 200, 'Student profile retrieved successfully', student);
});

/**
 * @desc Update authenticated student's profile
 * @route PUT /api/v1/student/profile
 */
const updateStudentProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new NotFoundError('User context not found');
  }

  const { name, phone, department, semester } = req.body;

  const updatedStudent = await prisma.student.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(department && { department }),
      ...(semester && { semester: Number(semester) })
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      rollNo: true,
      department: true,
      semester: true,
      profilePic: true,
      updatedAt: true
    }
  });

  return sendResponse(res, 200, 'Student profile updated successfully', updatedStudent);
});

export {
  getStudentProfile,
  updateStudentProfile
};
