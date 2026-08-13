import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';

/**
 * @desc Create transaction order session
 * @route POST /api/payment/create-order
 */
const createOrder = asyncHandler(async (req, res, next) => {
  const { registrationId } = z.object({ registrationId: z.string() }).parse(req.body);

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true }
  });

  if (!registration) {
    throw new NotFoundError('Registration not found');
  }

  const fee = Number(registration.event.registrationFee);
  if (fee <= 0) {
    throw new BadRequestError('This event is free of charge');
  }

  // Find or create payment record
  let payment = await prisma.payment.findUnique({
    where: { registrationId }
  });

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        registrationId,
        amount: fee,
        status: 'PENDING'
      }
    });
  } else if (payment.status === 'SUCCESS') {
    throw new BadRequestError('Payment has already been successfully made for this event');
  }

  // Generate a mock gateway order ID (e.g. Razorpay/Stripe order format)
  const gatewayOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;

  // Save the gateway order id to transactionId temporarily
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      transactionId: gatewayOrderId
    }
  });

  return sendResponse(res, 201, 'Payment order created successfully', {
    orderId: gatewayOrderId,
    paymentId: updatedPayment.id,
    amount: fee,
    currency: 'INR'
  });
});

/**
 * @desc Verify payment signature and complete registration
 * @route POST /api/payment/verify
 */
const verifyPayment = asyncHandler(async (req, res, next) => {
  const schema = z.object({
    orderId: z.string(),
    paymentId: z.string(), // Gateway transaction id
    signature: z.string(), // Mock signature verification
    status: z.enum(['SUCCESS', 'FAILED'])
  });

  const { orderId, paymentId, status } = schema.parse(req.body);

  // Find payment by mock orderId (saved in step 1)
  const payment = await prisma.payment.findFirst({
    where: { transactionId: orderId }
  });

  if (!payment) {
    throw new NotFoundError('Payment transaction record not found');
  }

  if (payment.status === 'SUCCESS') {
    return sendResponse(res, 200, 'Payment verified successfully (Already completed)', payment);
  }

  // Update payment and registration status
  if (status === 'SUCCESS') {
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        transactionId: paymentId,
        paymentDate: new Date(),
        paymentMethod: 'UPI/CARD'
      }
    });

    await prisma.registration.update({
      where: { id: payment.registrationId },
      data: { status: 'REGISTERED' }
    });

    return sendResponse(res, 200, 'Payment verified and registration completed successfully', updatedPayment);
  } else {
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' }
    });

    return sendResponse(res, 400, 'Payment verification failed', updatedPayment);
  }
});

/**
 * @desc Get payment history for student
 * @route GET /api/payment/history
 */
const getPaymentHistory = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    throw new BadRequestError('Only students can view their payment history');
  }

  const studentId = req.user.id;

  const payments = await prisma.payment.findMany({
    where: {
      registration: {
        studentId
      }
    },
    include: {
      registration: {
        include: {
          event: {
            select: { title: true, date: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, 'Payment history retrieved successfully', payments);
});

/**
 * @desc Get payment details by ID
 * @route GET /api/payment/:paymentId
 */
const getPaymentById = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      registration: {
        include: {
          student: { select: { name: true, rollNo: true, email: true } },
          event: { select: { title: true, date: true } }
        }
      }
    }
  });

  if (!payment) {
    throw new NotFoundError('Payment record not found');
  }

  // Authorization check
  if (req.user && req.user.role === 'STUDENT' && payment.registration.studentId !== req.user.id) {
    throw new BadRequestError('You are not authorized to view this payment record');
  }

  return sendResponse(res, 200, 'Payment transaction retrieved successfully', payment);
});

export {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getPaymentById
};
