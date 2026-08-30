import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const studentRegisterSchema = z.object({
  email: z.string().email('Invalid email address').refine((val) => val.endsWith('@rku.ac.in') || val.endsWith('.rku.ac.in'), {
    message: 'Email must be an official RKU domain (e.g. @rku.ac.in)'
  }),
  password: passwordSchema,
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
  newPassword: passwordSchema
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: passwordSchema
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const staffRegisterSchema = z.object({
  email: z.string().email('Invalid email address').refine((val) => val.endsWith('@rku.ac.in') || val.endsWith('.rku.ac.in'), {
    message: 'Email must be an official RKU domain (e.g. @rku.ac.in)'
  }),
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phone: z.string().optional(),
  role: z.enum(['FACULTY', 'VOLUNTEER'])
});

// ─── Common Param Schemas ────────────────────────────────────────────────────

/** Validates a single :id route parameter (Prisma CUID format) */
const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required').max(64, 'ID is too long')
});

/** Validates :eventId route parameter */
const eventIdParamSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required').max(64, 'Event ID is too long')
});

/** Validates :registrationId route parameter */
const registrationIdParamSchema = z.object({
  registrationId: z.string().min(1, 'Registration ID is required').max(64, 'Registration ID is too long')
});

/** Validates :categoryId route parameter */
const categoryIdParamSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required').max(64, 'Category ID is too long')
});

/** Validates :paymentId route parameter */
const paymentIdParamSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required').max(64, 'Payment ID is too long')
});

/** Validates :year route parameter */
const yearParamSchema = z.object({
  year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number')
});

// ─── Common Query Schemas ────────────────────────────────────────────────────

/** Validates optional search query parameter */
const searchQuerySchema = z.object({
  search: z.string().max(200, 'Search query is too long').optional(),
  page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional()
}).passthrough();

// ─── Body Schemas ────────────────────────────────────────────────────────────

/** Create event body validation */
const createEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
  category: z.string().min(1).optional(),
  location: z.string().max(500).optional(),
  venue: z.string().max(500).optional(),
  date: z.string().optional(),
  dateTime: z.string().optional(),
  startDate: z.string().optional(),
  time: z.string().optional(),
  maxParticipants: z.number().int().min(1).max(100000).optional(),
  registrationFee: z.number().min(0).optional(),
  fee: z.number().min(0).optional(),
  registrationDeadline: z.string().optional(),
  isFeatured: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  coordinatorId: z.string().max(64).optional(),
}).passthrough();

/** Update event body validation */
const updateEventSchema = createEventSchema.partial();

/** Submit scores body validation */
const submitScoresSchema = z.object({
  scores: z.array(z.object({
    registrationId: z.string().min(1, 'Registration ID is required'),
    score: z.number().min(0, 'Score must be non-negative'),
    rank: z.number().int().min(1).optional()
  })).min(1, 'At least one score is required')
});

/** Submit feedback body validation */
const submitFeedbackSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
});

/** Update student profile body validation */
const updateStudentProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  semester: z.union([z.number().int().min(1).max(8), z.string().regex(/^[1-8]$/)]).optional(),
  profilePic: z.string().optional()
}).passthrough();

/** Block/Unblock user body validation */
const blockUserSchema = z.object({
  blocked: z.boolean(),
  blockedReason: z.string().max(500).optional()
});

/** Assign coordinator body validation */
const assignCoordinatorSchema = z.object({
  coordinatorId: z.string().min(1, 'Coordinator ID is required').max(64)
});

/** Event registration body validation */
const eventRegistrationSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required').max(64)
}).passthrough();

export {
  studentRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resendOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  staffRegisterSchema,
  // Param schemas
  idParamSchema,
  eventIdParamSchema,
  registrationIdParamSchema,
  categoryIdParamSchema,
  paymentIdParamSchema,
  yearParamSchema,
  // Query schemas
  searchQuerySchema,
  // Body schemas
  createEventSchema,
  updateEventSchema,
  submitScoresSchema,
  submitFeedbackSchema,
  updateStudentProfileSchema,
  blockUserSchema,
  assignCoordinatorSchema,
  eventRegistrationSchema
};
