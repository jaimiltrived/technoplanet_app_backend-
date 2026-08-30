import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * @desc Get authenticated student's profile details
 * @route GET /api/student/profile
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
 * @desc Update authenticated student's profile (supports profilePic file upload via Cloudinary or URL)
 * @route PUT /api/student/profile
 */
const updateStudentProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new NotFoundError('User context not found');
  }

  const { name, phone, department, semester } = req.body;
  let profilePic;
  const imageInput = req.file ? req.file.buffer : req.body.profilePic;

  if (imageInput && (req.file || (typeof imageInput === 'string' && (imageInput.startsWith('data:image/') || !imageInput.startsWith('http'))))) {
    const uploadResult = await uploadToCloudinary(imageInput, {
      folder: 'rku_app/profiles',
      mimetype: req.file?.mimetype
    });
    profilePic = uploadResult.secure_url;
  }

  const updatedStudent = await prisma.student.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(department && { department }),
      ...(semester && { semester: Number(semester) }),
      ...(profilePic && { profilePic })
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
