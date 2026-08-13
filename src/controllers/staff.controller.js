import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get authenticated staff member's profile
 * @route GET /api/v1/staff/profile
 */
const getStaffProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new NotFoundError('User context not found');
  }

  const staff = await prisma.staff.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!staff) {
    throw new NotFoundError('Staff profile not found');
  }

  return sendResponse(res, 200, 'Staff profile retrieved successfully', staff);
});

export {
  getStaffProfile
};
