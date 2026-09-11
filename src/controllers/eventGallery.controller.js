import crypto from 'crypto';
import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { z } from 'zod';

// ─── Table Auto-Initialization ───────────────────────────────────────────────

let isTableInitialized = false;

/**
 * Ensures EventGalleryImage table exists in MySQL database even if migrations haven't been run.
 */
const ensureGalleryTable = async () => {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`EventGalleryImage\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`eventId\` VARCHAR(191) NOT NULL,
        \`uploadedById\` VARCHAR(191) NOT NULL,
        \`cloudinaryPublicId\` VARCHAR(191) NOT NULL,
        \`imageUrl\` VARCHAR(191) NOT NULL,
        \`secureUrl\` VARCHAR(191) NOT NULL,
        \`caption\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`EventGalleryImage_eventId_idx\`(\`eventId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    isTableInitialized = true;
  } catch (err) {
    console.warn('[EventGallery] Auto-create table notice:', err.message);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify that the authenticated user is the coordinator (or ADMIN) for the event.
 * @returns {Promise<object>} The event record
 */
const verifyCoordinatorAccess = async (eventId, user) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  if (user.role !== 'ADMIN' && event.coordinatorId !== user.id) {
    throw new ForbiddenError('You are not authorized to manage this event gallery.');
  }

  return event;
};

/**
 * Insert a Cloudinary transformation segment into a secure_url for thumbnails.
 * Example: /upload/v1234/... → /upload/c_fill,w_400,h_400,q_auto,f_auto/v1234/...
 */
const toThumbnailUrl = (secureUrl) => {
  if (!secureUrl) return secureUrl;
  if (secureUrl.includes('/upload/')) {
    return secureUrl.replace('/upload/', '/upload/c_fill,w_400,h_400,q_auto,f_auto/');
  }
  // If wsrv.nl proxy URL is used
  if (secureUrl.includes('wsrv.nl/?url=')) {
    return `${secureUrl}&w=400&h=400&fit=cover`;
  }
  return secureUrl;
};

// ─── Validation Schemas ──────────────────────────────────────────────────────

const captionSchema = z.object({
  caption: z.string().max(1000, 'Caption must be under 1000 characters').nullable().optional(),
});

// ─── Resilient Data Access Helpers (Prisma Model + Raw SQL Fallback) ──────────

const queryGalleryImages = async (eventId, limit, skip) => {
  await ensureGalleryTable();

  if (prisma.eventGalleryImage) {
    return await Promise.all([
      prisma.eventGalleryImage.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.eventGalleryImage.count({ where: { eventId } }),
    ]);
  }

  // Safe fallback if prisma client was not regenerated on the server
  const rawImages = await prisma.$queryRawUnsafe(`
    SELECT g.*, s.name as uploaderName, s.id as uploaderId
    FROM \`EventGalleryImage\` g
    LEFT JOIN \`Staff\` s ON g.uploadedById = s.id
    WHERE g.eventId = ?
    ORDER BY g.createdAt DESC
    LIMIT ? OFFSET ?
  `, eventId, limit, skip);

  const countResult = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as total FROM \`EventGalleryImage\` WHERE eventId = ?
  `, eventId);

  const total = Number(countResult[0]?.total || 0);

  const images = (rawImages || []).map((img) => ({
    id: img.id,
    eventId: img.eventId,
    imageUrl: img.imageUrl,
    secureUrl: img.secureUrl,
    caption: img.caption,
    cloudinaryPublicId: img.cloudinaryPublicId,
    createdAt: img.createdAt,
    uploadedBy: img.uploaderId ? { id: img.uploaderId, name: img.uploaderName } : null,
  }));

  return [images, total];
};

const insertGalleryImage = async ({ eventId, uploadedById, cloudinaryPublicId, imageUrl, secureUrl, caption, uploaderName }) => {
  await ensureGalleryTable();

  if (prisma.eventGalleryImage) {
    return await prisma.eventGalleryImage.create({
      data: {
        eventId,
        uploadedById,
        cloudinaryPublicId,
        imageUrl,
        secureUrl,
        caption,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  const id = crypto.randomUUID();
  const now = new Date();
  await prisma.$executeRawUnsafe(`
    INSERT INTO \`EventGalleryImage\` (\`id\`, \`eventId\`, \`uploadedById\`, \`cloudinaryPublicId\`, \`imageUrl\`, \`secureUrl\`, \`caption\`, \`createdAt\`, \`updatedAt\`)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, id, eventId, uploadedById, cloudinaryPublicId, imageUrl, secureUrl, caption ?? null, now, now);

  return {
    id,
    eventId,
    uploadedById,
    cloudinaryPublicId,
    imageUrl,
    secureUrl,
    caption: caption ?? null,
    createdAt: now,
    uploadedBy: { id: uploadedById, name: uploaderName },
  };
};

const findGalleryImageById = async (imageId) => {
  await ensureGalleryTable();

  if (prisma.eventGalleryImage) {
    return await prisma.eventGalleryImage.findUnique({
      where: { id: imageId },
    });
  }

  const results = await prisma.$queryRawUnsafe(`
    SELECT * FROM \`EventGalleryImage\` WHERE id = ? LIMIT 1
  `, imageId);

  return results && results.length > 0 ? results[0] : null;
};

const removeGalleryImageById = async (imageId) => {
  await ensureGalleryTable();

  if (prisma.eventGalleryImage) {
    return await prisma.eventGalleryImage.delete({
      where: { id: imageId },
    });
  }

  return await prisma.$executeRawUnsafe(`
    DELETE FROM \`EventGalleryImage\` WHERE id = ?
  `, imageId);
};

const updateGalleryImageCaption = async (imageId, caption, uploader) => {
  await ensureGalleryTable();

  if (prisma.eventGalleryImage) {
    return await prisma.eventGalleryImage.update({
      where: { id: imageId },
      data: { caption: caption ?? null },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  const now = new Date();
  await prisma.$executeRawUnsafe(`
    UPDATE \`EventGalleryImage\` SET caption = ?, updatedAt = ? WHERE id = ?
  `, caption ?? null, now, imageId);

  const image = await findGalleryImageById(imageId);
  return {
    ...image,
    uploadedBy: uploader ? { id: uploader.id, name: uploader.name } : null,
  };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc Get gallery images for an event (public, paginated)
 * @route GET /api/events/:eventId/gallery
 */
const getEventGallery = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Verify event exists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true },
  });

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '30', 10);
  const skip = (page - 1) * limit;

  const [images, total] = await queryGalleryImages(eventId, limit, skip);

  const data = {
    event: { id: event.id, title: event.title },
    images: images.map((img) => ({
      id: img.id,
      imageUrl: img.secureUrl || img.imageUrl,
      thumbnailUrl: toThumbnailUrl(img.secureUrl || img.imageUrl),
      caption: img.caption,
      uploadedBy: img.uploadedBy,
      createdAt: img.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  return sendResponse(res, 200, 'Event gallery retrieved successfully', data);
});

/**
 * @desc Upload gallery images for an event (faculty coordinator only)
 * @route POST /api/faculty/events/:eventId/gallery
 */
const uploadGalleryImages = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Verify coordinator access
  await verifyCoordinatorAccess(eventId, req.user);

  // Validate files exist
  if (!req.files || req.files.length === 0) {
    throw new BadRequestError('No image files provided. Please select at least one image.');
  }

  if (req.files.length > 20) {
    throw new BadRequestError('Maximum 20 images can be uploaded at once.');
  }

  const caption = req.body.caption || null;
  const uploadedImages = [];
  const trackingUploads = []; // Track for cleanup on failure

  try {
    for (const file of req.files) {
      // Upload image (Cloudinary or reliable CDN fallback)
      const result = await uploadToCloudinary(file.buffer, {
        folder: `rku_app/event_gallery/${eventId}`,
        mimetype: file.mimetype,
        filename: file.originalname || `gallery_${Date.now()}.jpg`,
      });

      trackingUploads.push(result.public_id);

      // Save to database
      const image = await insertGalleryImage({
        eventId,
        uploadedById: req.user.id,
        cloudinaryPublicId: result.public_id,
        imageUrl: result.url || result.secure_url,
        secureUrl: result.secure_url,
        caption,
        uploaderName: req.user.name,
      });

      uploadedImages.push({
        id: image.id,
        imageUrl: image.secureUrl || image.imageUrl,
        thumbnailUrl: toThumbnailUrl(image.secureUrl || image.imageUrl),
        caption: image.caption,
        cloudinaryPublicId: image.cloudinaryPublicId,
        uploadedBy: image.uploadedBy,
        createdAt: image.createdAt,
      });
    }
  } catch (error) {
    // If DB insert fails after some uploads, clean up orphaned assets
    const savedPublicIds = uploadedImages.map((img) => img.cloudinaryPublicId);
    const orphanedIds = trackingUploads.filter((id) => !savedPublicIds.includes(id));

    for (const publicId of orphanedIds) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cleanupErr) {
        console.error(`[EventGallery] Failed to cleanup orphaned asset: ${publicId}`, cleanupErr);
      }
    }

    throw error;
  }

  return sendResponse(res, 201, `${uploadedImages.length} image(s) uploaded successfully`, {
    uploaded: uploadedImages.length,
    images: uploadedImages,
  });
});

/**
 * @desc Delete a gallery image (faculty coordinator only)
 * @route DELETE /api/faculty/events/:eventId/gallery/:imageId
 */
const deleteGalleryImage = asyncHandler(async (req, res) => {
  const { eventId, imageId } = req.params;

  // Verify coordinator access
  await verifyCoordinatorAccess(eventId, req.user);

  // Find the image
  const image = await findGalleryImageById(imageId);

  if (!image) {
    throw new NotFoundError('Gallery image not found');
  }

  if (image.eventId !== eventId) {
    throw new BadRequestError('Image does not belong to this event');
  }

  // Delete from Cloudinary / fallback CDN
  const deleteResult = await deleteFromCloudinary(image.cloudinaryPublicId);

  if (deleteResult && deleteResult.result !== 'ok' && deleteResult.result !== 'not found') {
    console.error(`[EventGallery] Deletion returned unexpected result for ${image.cloudinaryPublicId}:`, deleteResult);
  }

  // Delete from database
  await removeGalleryImageById(imageId);

  return sendResponse(res, 200, 'Gallery image deleted successfully');
});

/**
 * @desc Update gallery image caption (faculty coordinator only)
 * @route PATCH /api/faculty/events/:eventId/gallery/:imageId
 */
const updateGalleryCaption = asyncHandler(async (req, res) => {
  const { eventId, imageId } = req.params;

  // Verify coordinator access
  await verifyCoordinatorAccess(eventId, req.user);

  // Validate body
  const { caption } = captionSchema.parse(req.body);

  // Find the image
  const image = await findGalleryImageById(imageId);

  if (!image) {
    throw new NotFoundError('Gallery image not found');
  }

  if (image.eventId !== eventId) {
    throw new BadRequestError('Image does not belong to this event');
  }

  // Update caption
  const updated = await updateGalleryImageCaption(imageId, caption, req.user);

  return sendResponse(res, 200, 'Caption updated successfully', {
    id: updated.id,
    imageUrl: updated.secureUrl || updated.imageUrl,
    thumbnailUrl: toThumbnailUrl(updated.secureUrl || updated.imageUrl),
    caption: updated.caption,
    uploadedBy: updated.uploadedBy,
    createdAt: updated.createdAt,
  });
});

export {
  getEventGallery,
  uploadGalleryImages,
  deleteGalleryImage,
  updateGalleryCaption,
};
