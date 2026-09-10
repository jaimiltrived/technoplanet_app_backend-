import prisma from '../config/db.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/customErrors.js';

/**
 * Get events accessible to a faculty/admin user for the mail feature.
 * - ADMIN: all events
 * - FACULTY: only events they coordinate
 * @param {object} user - req.user (decoded JWT payload: { id, role })
 * @returns {Promise<Array>} - Array of { id, title }
 */
const getMailEvents = async (user) => {
  const where = user.role === 'ADMIN' ? {} : { coordinatorId: user.id };

  return prisma.event.findMany({
    where,
    select: { id: true, title: true },
    orderBy: { date: 'desc' },
  });
};

/**
 * Verify that a faculty user has access to the specified event.
 * ADMINs can access any event.
 * @param {string} eventId
 * @param {object} user - req.user
 * @returns {Promise<object>} - The event record
 */
const verifyEventAccess = async (eventId, user) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (user.role !== 'ADMIN' && event.coordinatorId !== user.id) {
    throw new ForbiddenError('You are not the coordinator for this event');
  }

  return event;
};

/**
 * Get recipient list based on event selection and recipient type.
 *
 * @param {object} user - req.user
 * @param {string|null} eventId - specific event ID, or 'all' / null for all events
 * @param {string} recipientType - 'students' | 'volunteers' | 'all'
 * @returns {Promise<Array<{email: string, name: string, type: string, eventTitle?: string}>>}
 */
const getRecipients = async (user, eventId, recipientType) => {
  const isAllEvents = !eventId || eventId === 'all';

  // Determine which event IDs to query
  let eventIds = [];

  if (isAllEvents) {
    // Get all events for this faculty / all events for admin
    const where = user.role === 'ADMIN' ? {} : { coordinatorId: user.id };
    const events = await prisma.event.findMany({
      where,
      select: { id: true },
    });
    eventIds = events.map((e) => e.id);
  } else {
    // Verify access to the specific event
    await verifyEventAccess(eventId, user);
    eventIds = [eventId];
  }

  if (eventIds.length === 0) {
    return [];
  }

  const recipients = [];
  const seenEmails = new Set();

  // Get students (registered participants)
  if (recipientType === 'students' || recipientType === 'all') {
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: { in: eventIds },
        status: 'REGISTERED',
      },
      include: {
        student: {
          select: { email: true, name: true },
        },
        event: {
          select: { title: true },
        },
      },
    });

    for (const reg of registrations) {
      if (reg.student.email && !seenEmails.has(reg.student.email)) {
        seenEmails.add(reg.student.email);
        recipients.push({
          email: reg.student.email,
          name: reg.student.name,
          type: 'student',
          eventTitle: reg.event.title,
        });
      }
    }
  }

  // Get volunteers (staff assigned as volunteers to events)
  if (recipientType === 'volunteers' || recipientType === 'all') {
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      include: {
        volunteers: {
          select: { email: true, name: true },
        },
      },
    });

    for (const event of events) {
      for (const vol of event.volunteers) {
        if (vol.email && !seenEmails.has(vol.email)) {
          seenEmails.add(vol.email);
          recipients.push({
            email: vol.email,
            name: vol.name,
            type: 'volunteer',
            eventTitle: event.title,
          });
        }
      }
    }
  }

  return recipients;
};

export { getMailEvents, verifyEventAccess, getRecipients };
