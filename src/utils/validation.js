import { z } from 'zod';

const studentRegisterSchema = z.object({
  email: z.string().email('Invalid email address').refine((val) => val.endsWith('@rku.ac.in') || val.endsWith('.rku.ac.in'), {
    message: 'Email must be an official RKU domain (e.g. @rku.ac.in)'
  }),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z.string().optional(),
  rollNo: z.string().min(1, 'Roll number is required'),
  department: z.string().min(2, 'Department is required'),
  semester: z.number().int().min(1).max(8)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits')
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long')
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const staffRegisterSchema = z.object({
  email: z.string().email('Invalid email address').refine((val) => val.endsWith('@rku.ac.in') || val.endsWith('.rku.ac.in'), {
    message: 'Email must be an official RKU domain (e.g. @rku.ac.in)'
  }),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'FACULTY', 'VOLUNTEER'])
});

export {
  studentRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  staffRegisterSchema
};
