import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get all gallery images (combines event gallery images and general gallery photos)
 * @route GET /api/gallery
 */
const getGallery = asyncHandler(async (req, res, next) => {
  const { year } = req.query;

  // 1. Fetch general legacy gallery records
  let galleryItems = [];
  try {
    galleryItems = await prisma.gallery.findMany({
      where: year ? { year: Number(year) } : {},
      orderBy: { createdAt: 'desc' },
    });
  } catch (e) {
    console.warn('[Gallery] Note: general gallery query returned:', e.message);
  }

  // 2. Fetch event gallery images
  let eventGalleryItems = [];
  try {
    if (prisma.eventGalleryImage) {
      eventGalleryItems = await prisma.eventGalleryImage.findMany({
        include: {
          event: {
            select: { id: true, title: true, date: true, category: { select: { name: true } } },
          },
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Safe fallback if prisma client was not regenerated
      const raw = await prisma.$queryRawUnsafe(`
        SELECT g.*, e.title as eventTitle, e.date as eventDate, c.name as categoryName, s.name as uploaderName
        FROM \`EventGalleryImage\` g
        LEFT JOIN \`Event\` e ON g.eventId = e.id
        LEFT JOIN \`Category\` c ON e.categoryId = c.id
        LEFT JOIN \`Staff\` s ON g.uploadedById = s.id
        ORDER BY g.createdAt DESC
      `).catch(() => []);

      eventGalleryItems = (raw || []).map((r) => ({
        id: r.id,
        imageUrl: r.secureUrl || r.imageUrl,
        secureUrl: r.secureUrl,
        caption: r.caption,
        createdAt: r.createdAt,
        uploadedBy: r.uploaderName ? { name: r.uploaderName } : null,
        event: {
          id: r.eventId,
          title: r.eventTitle || 'Event Gallery',
          date: r.eventDate,
          category: { name: r.categoryName || 'Technical' },
        },
      }));
    }
  } catch (e) {
    console.warn('[Gallery] Note: event gallery query returned:', e.message);
  }

  // Format event images to standard gallery structure
  const formattedEventItems = eventGalleryItems.map((item) => {
    const evYear = item.event?.date
      ? new Date(item.event.date).getFullYear()
      : (item.createdAt ? new Date(item.createdAt).getFullYear() : new Date().getFullYear());

    return {
      id: item.id,
      imageUrl: item.secureUrl || item.imageUrl,
      url: item.secureUrl || item.imageUrl,
      photo: item.secureUrl || item.imageUrl,
      eventTitle: item.event?.title || 'Event Gallery',
      eventId: item.event?.id || item.eventId,
      title: item.event?.title || 'Event Gallery',
      description: item.caption || '',
      caption: item.caption || '',
      year: evYear,
      category: item.event?.category?.name || 'Technical',
      uploadedBy: item.uploadedBy?.name,
      createdAt: item.createdAt,
    };
  });

  const formattedGalleryItems = galleryItems.map((item) => ({
    id: item.id,
    imageUrl: item.imageUrl,
    url: item.imageUrl,
    photo: item.imageUrl,
    eventTitle: item.description || 'Gallery',
    title: item.description || 'Gallery',
    description: item.description || '',
    caption: item.description || '',
    year: item.year,
    category: 'General',
    createdAt: item.createdAt,
  }));

  let allItems = [...formattedEventItems, ...formattedGalleryItems];

  if (year) {
    allItems = allItems.filter((item) => String(item.year) === String(year));
  }

  return sendResponse(res, 200, 'Gallery retrieved successfully', allItems);
});

/**
 * @desc Get gallery images by year/event
 * @route GET /api/gallery/:year
 */
const getGalleryByYear = asyncHandler(async (req, res, next) => {
  const { year } = req.params;
  req.query.year = year;
  return getGallery(req, res, next);
});

export {
  getGallery,
  getGalleryByYear,
};
