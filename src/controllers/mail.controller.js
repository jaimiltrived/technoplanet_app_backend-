import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { z } from 'zod';
import { getMailEvents, getRecipients, verifyEventAccess } from '../services/recipient.service.js';
import { sendBulkMail } from '../services/mail.service.js';
import { getAvailableVariables } from '../services/template.service.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const previewRecipientsSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  recipientType: z.enum(['students', 'volunteers', 'all'], {
    errorMap: () => ({ message: 'recipientType must be students, volunteers, or all' }),
  }),
});

const sendMailSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  recipientType: z.enum(['students', 'volunteers', 'all'], {
    errorMap: () => ({ message: 'recipientType must be students, volunteers, or all' }),
  }),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Message body is required').max(50000),
  templateId: z.string().optional(),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc Get events available to the faculty for the mail dropdown
 * @route GET /api/faculty/mail/events
 */
const getEvents = asyncHandler(async (req, res) => {
  const events = await getMailEvents(req.user);
  return sendResponse(res, 200, 'Mail events retrieved successfully', events);
});

/**
 * @desc Get active mail templates
 * @route GET /api/faculty/mail/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
  const templates = await prisma.mailTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const variables = getAvailableVariables();

  return sendResponse(res, 200, 'Mail templates retrieved successfully', {
    templates,
    availableVariables: variables,
  });
});

/**
 * @desc Preview recipients (count + list) before sending mail
 * @route POST /api/faculty/mail/recipients/preview
 */
const previewRecipients = asyncHandler(async (req, res) => {
  const { eventId, recipientType } = previewRecipientsSchema.parse(req.body);

  const recipients = await getRecipients(req.user, eventId, recipientType);

  return sendResponse(res, 200, 'Recipient preview generated successfully', {
    totalCount: recipients.length,
    recipients: recipients.map((r) => ({
      name: r.name,
      email: r.email,
      type: r.type,
      eventTitle: r.eventTitle,
    })),
  });
});

/**
 * @desc Send personalized emails to recipients
 * @route POST /api/faculty/mail/send
 */
const sendMail = asyncHandler(async (req, res) => {
  const { eventId, recipientType, subject, body, templateId } = sendMailSchema.parse(req.body);

  // Get recipients
  const recipients = await getRecipients(req.user, eventId, recipientType);

  if (recipients.length === 0) {
    throw new BadRequestError('No recipients found for the selected criteria');
  }

  // Get event details for template variables (if specific event)
  let eventDetails = null;
  if (eventId && eventId !== 'all') {
    eventDetails = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, date: true, venue: true },
    });
  }

  // Get sender details
  const sender = await prisma.staff.findUnique({
    where: { id: req.user.id },
    select: { name: true, email: true },
  });

  // Build variable resolver for personalization
  const variableResolver = (recipient) => ({
    participantName: recipient.name || '',
    participantEmail: recipient.email || '',
    eventTitle: eventDetails?.title || recipient.eventTitle || '',
    eventDate: eventDetails?.date ? new Date(eventDetails.date).toLocaleDateString('en-IN') : '',
    eventVenue: eventDetails?.venue || '',
    senderName: sender?.name || '',
  });

  // Send emails in batches
  const result = await sendBulkMail(recipients, subject, body, variableResolver, 5);

  // Log the mail send operation
  await prisma.mailLog.create({
    data: {
      sentById: req.user.id,
      eventId: eventId === 'all' ? null : eventId,
      recipientType,
      subject,
      templateId: templateId || null,
      totalRecipients: recipients.length,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
    },
  });

  return sendResponse(res, 200, `Emails sent: ${result.sentCount} successful, ${result.failedCount} failed`, {
    sentCount: result.sentCount,
    failedCount: result.failedCount,
    totalRecipients: recipients.length,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
});

/**
 * @desc Get mail send history for the authenticated faculty
 * @route GET /api/faculty/mail/history
 */
const getMailHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const skip = (page - 1) * limit;

  const where = req.user.role === 'ADMIN' ? {} : { sentById: req.user.id };

  const [logs, total] = await Promise.all([
    prisma.mailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sentBy: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.mailLog.count({ where }),
  ]);

  return sendResponse(res, 200, 'Mail history retrieved successfully', {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export {
  getEvents,
  getTemplates,
  previewRecipients,
  sendMail,
  getMailHistory,
};
