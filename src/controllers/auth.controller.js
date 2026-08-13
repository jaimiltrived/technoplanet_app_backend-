import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, UnauthorizedError, ConflictError, ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { loginSchema, forgotPasswordSchema, verifyOtpSchema, resendOtpSchema, resetPasswordSchema, changePasswordSchema, refreshTokenSchema, studentRegisterSchema, staffRegisterSchema } from '../utils/validation.js';

// Helper to generate access token
const generateAccessToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'supersecretkey_rku_technoplanet_2026_dev',
    { expiresIn: '15m' } // 15 mins for access token
  );
};

// Helper to generate refresh token
const generateRefreshToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'supersecretkey_rku_technoplanet_2026_dev',
    { expiresIn: '7d' } // 7 days for refresh token
  );
};

/**
 * @desc Unified Login (Student & Staff)
 * @route POST /api/auth/login
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = loginSchema.parse(req.body);

  let user = null;

  let role = 'STUDENT';

  // 1. Check Student table
  const student = await prisma.student.findUnique({ where: { email } });
  if (student) {
    user = student;
    role = 'STUDENT';
  } else {
    // 2. Check Staff table
    const staff = await prisma.staff.findUnique({ where: { email } });
    if (staff) {
      user = staff;
      role = staff.role;
    }
  }

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is blocked
  if (user.blocked) {
    throw new ForbiddenError(`Your account has been blocked: ${user.blockedReason || 'No reason provided'}`);
  }

  // Compare passwords
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email, role);
  const refreshToken = generateRefreshToken(user.id, user.email, role);

  // Store refresh token in database
  if (role === 'STUDENT') {
    await prisma.student.update({
      where: { id: user.id },
      data: { refreshToken }
    });
  } else {
    await prisma.staff.update({
      where: { id: user.id },
      data: { refreshToken }
    });
  }

  // Omit password and refresh token from profile
  const { password: _, refreshToken: __, otpCode: ___, otpExpires: ____, ...profile } = user;

  return sendResponse(res, 200, 'Login successful', {
    accessToken,
    refreshToken,
    role,
    profile
  });
});

/**
 * @desc Logout
 * @route POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, role } = req.user;

  if (role === 'STUDENT') {
    await prisma.student.update({
      where: { id },
      data: { refreshToken: null }
    });
  } else {
    await prisma.staff.update({
      where: { id },
      data: { refreshToken: null }
    });
  }

  return sendResponse(res, 200, 'Logged out successfully');
});

/**
 * @desc Refresh JWT Token
 * @route POST /api/auth/refresh-token
 */
const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'supersecretkey_rku_technoplanet_2026_dev');

    let user = null;
    if (decoded.role === 'STUDENT') {
      user = await prisma.student.findUnique({ where: { id: decoded.id } });
    } else {
      user = await prisma.staff.findUnique({ where: { id: decoded.id } });
    }

    if (!user || user.refreshToken !== refreshToken || user.blocked) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user.id, user.email, decoded.role);
    const newRefreshToken = generateRefreshToken(user.id, user.email, decoded.role);

    // Update refresh token
    if (decoded.role === 'STUDENT') {
      await prisma.student.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
      });
    } else {
      await prisma.staff.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken }
      });
    }

    return sendResponse(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
});

/**
 * @desc Forgot Password - Send OTP
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  /** @type {'student' | 'staff'} */
  let userTable = 'student';
  let user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.staff.findUnique({ where: { email } });
    userTable = 'staff';
  }

  if (!user) {
    throw new NotFoundError('No account found with this email address');
  }

  // Generate 6-digit OTP code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Save OTP code in DB
  if (userTable === 'student') {
    await prisma.student.update({
      where: { email },
      data: { otpCode, otpExpires }
    });
  } else {
    await prisma.staff.update({
      where: { email },
      data: { otpCode, otpExpires }
    });
  }

  // Simulated OTP Sending
  console.log(`[OTP ALERT] Sent OTP Code ${otpCode} to ${email}`);

  return sendResponse(res, 200, 'OTP sent successfully (Simulated). Please check console logs.');
});

/**
 * @desc Verify OTP
 * @route POST /api/auth/verify-otp
 */
const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otpCode } = verifyOtpSchema.parse(req.body);

  /** @type {'student' | 'staff'} */
  let userTable = 'student';
  let user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.staff.findUnique({ where: { email } });
    userTable = 'staff';
  }

  if (!user || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw new BadRequestError('Invalid or expired OTP');
  }

  // Mark email and clear OTP
  if (userTable === 'student') {
    await prisma.student.update({
      where: { email },
      data: { isEmailVerified: true, otpCode: null, otpExpires: null }
    });
  } else {
    await prisma.staff.update({
      where: { email },
      data: { isEmailVerified: true, otpCode: null, otpExpires: null }
    });
  }

  return sendResponse(res, 200, 'OTP verified successfully');
});

/**
 * @desc Resend OTP
 * @route POST /api/auth/resend-otp
 */
const resendOtp = asyncHandler(async (req, res, next) => {
  const { email } = resendOtpSchema.parse(req.body);

  /** @type {'student' | 'staff'} */
  let userTable = 'student';
  let user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.staff.findUnique({ where: { email } });
    userTable = 'staff';
  }

  if (!user) {
    throw new NotFoundError('No account found with this email');
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

  if (userTable === 'student') {
    await prisma.student.update({
      where: { email },
      data: { otpCode, otpExpires }
    });
  } else {
    await prisma.staff.update({
      where: { email },
      data: { otpCode, otpExpires }
    });
  }

  console.log(`[OTP ALERT] Resent OTP Code ${otpCode} to ${email}`);

  return sendResponse(res, 200, 'OTP resent successfully (Simulated)');
});

/**
 * @desc Reset Password (using OTP)
 * @route POST /api/auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otpCode, newPassword } = resetPasswordSchema.parse(req.body);

  /** @type {'student' | 'staff'} */
  let userTable = 'student';
  let user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.staff.findUnique({ where: { email } });
    userTable = 'staff';
  }

  if (!user || user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw new BadRequestError('Invalid or expired OTP');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (userTable === 'student') {
    await prisma.student.update({
      where: { email },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
        otpCode: null,
        otpExpires: null,
        refreshToken: null // Revoke sessions
      }
    });
  } else {
    await prisma.staff.update({
      where: { email },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
        otpCode: null,
        otpExpires: null,
        refreshToken: null
      }
    });
  }

  return sendResponse(res, 200, 'Password reset successfully. You can now log in with your new password.');
});

/**
 * @desc Change Password (authenticated)
 * @route POST /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
  const { id, role } = req.user;

  let user = null;
  if (role === 'STUDENT') {
    user = await prisma.student.findUnique({ where: { id } });
  } else {
    user = await prisma.staff.findUnique({ where: { id } });
  }

  if (!user) {
    throw new NotFoundError('User account not found');
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new BadRequestError('Incorrect current password');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (role === 'STUDENT') {
    await prisma.student.update({
      where: { id },
      data: { password: hashedPassword, refreshToken: null }
    });
  } else {
    await prisma.staff.update({
      where: { id },
      data: { password: hashedPassword, refreshToken: null }
    });
  }

  return sendResponse(res, 200, 'Password changed successfully. Please log in again.');
});

/**
 * @desc Get Logged-in User Profile
 * @route GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, role } = req.user;

  let user = null;
  if (role === 'STUDENT') {
    user = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        rollNo: true,
        department: true,
        semester: true,
        profilePic: true,
        isEmailVerified: true,
        blocked: true,
        createdAt: true
      }
    });
  } else {
    user = await prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        blocked: true,
        createdAt: true
      }
    });
  }

  if (!user) {
    throw new NotFoundError('User profile not found');
  }

  return sendResponse(res, 200, 'Profile retrieved successfully', {
    role,
    profile: user
  });
});

/**
 * @desc Update Logged-in User Profile
 * @route PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, role } = req.user;
  const { name, phone, department, semester } = req.body;

  let updatedUser = null;

  if (role === 'STUDENT') {
    updatedUser = await prisma.student.update({
      where: { id },
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
        isEmailVerified: true
      }
    });
  } else {
    updatedUser = await prisma.staff.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true
      }
    });
  }

  return sendResponse(res, 200, 'Profile updated successfully', {
    role,
    profile: updatedUser
  });
});

/**
 * @desc Student Registration (Exposed helper to create students easily)
 * @route POST /api/auth/register-student
 */
const registerStudent = asyncHandler(async (req, res, next) => {
  const validatedData = studentRegisterSchema.parse(req.body);

  const existingStudent = await prisma.student.findFirst({
    where: {
      OR: [
        { email: validatedData.email },
        { rollNo: validatedData.rollNo }
      ]
    }
  });

  if (existingStudent) {
    throw new ConflictError('Student with this email or roll number already exists');
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const student = await prisma.student.create({
    data: {
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      phone: validatedData.phone,
      rollNo: validatedData.rollNo,
      department: validatedData.department,
      semester: validatedData.semester,
      isEmailVerified: true // Auto-verify for dev convenience
    },
    select: {
      id: true,
      email: true,
      name: true,
      rollNo: true
    }
  });

  return sendResponse(res, 201, 'Student registered successfully', student);
});

/**
 * @desc Staff Registration (Exposed helper to create staff easily)
 * @route POST /api/auth/register-staff
 */
const registerStaff = asyncHandler(async (req, res, next) => {
  const validatedData = staffRegisterSchema.parse(req.body);

  const existingStaff = await prisma.staff.findUnique({
    where: { email: validatedData.email }
  });

  if (existingStaff) {
    throw new ConflictError('Staff member with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(validatedData.password, 10);

  const staff = await prisma.staff.create({
    data: {
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      phone: validatedData.phone,
      role: validatedData.role,
      isEmailVerified: true
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  return sendResponse(res, 201, 'Staff member registered successfully', staff);
});

export {
  login,
  logout,
  refresh,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  registerStudent,
  registerStaff
};
