import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { z } from 'zod';

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
  return secureUrl.replace('/upload/', '/upload/c_fill,w_400,h_400,q_auto,f_auto/');
};

// ─── Validation Schemas ──────────────────────────────────────────────────────

const captionSchema = z.object({
  caption: z.string().max(1000, 'Caption must be under 1000 characters').nullable().optional(),
});

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

  const [images, total] = await Promise.all([
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
  const cloudinaryUploads = []; // Track for cleanup on failure

  try {
    for (const file of req.files) {
      // Upload to Cloudinary with event-specific folder
      const result = await uploadToCloudinary(file.buffer, {
        folder: `rku_app/event_gallery/${eventId}`,
        mimetype: file.mimetype,
      });

      cloudinaryUploads.push(result.public_id);

      // Save to database
      const image = await prisma.eventGalleryImage.create({
        data: {
          eventId,
          uploadedById: req.user.id,
          cloudinaryPublicId: result.public_id,
          imageUrl: result.url || result.secure_url,
          secureUrl: result.secure_url,
          caption,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
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
    // If DB insert fails after some Cloudinary uploads, clean up orphaned assets
    const savedPublicIds = uploadedImages.map((img) => img.cloudinaryPublicId);
    const orphanedIds = cloudinaryUploads.filter((id) => !savedPublicIds.includes(id));

    for (const publicId of orphanedIds) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (cleanupErr) {
        console.error(`[EventGallery] Failed to cleanup orphaned Cloudinary asset: ${publicId}`, cleanupErr);
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
  const image = await prisma.eventGalleryImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new NotFoundError('Gallery image not found');
  }

  if (image.eventId !== eventId) {
    throw new BadRequestError('Image does not belong to this event');
  }

  // Delete from Cloudinary first
  const cloudinaryResult = await deleteFromCloudinary(image.cloudinaryPublicId);

  if (cloudinaryResult && cloudinaryResult.result !== 'ok' && cloudinaryResult.result !== 'not found') {
    console.error(`[EventGallery] Cloudinary deletion returned unexpected result for ${image.cloudinaryPublicId}:`, cloudinaryResult);
  }

  // Delete from database
  await prisma.eventGalleryImage.delete({
    where: { id: imageId },
  });

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
  const image = await prisma.eventGalleryImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new NotFoundError('Gallery image not found');
  }

  if (image.eventId !== eventId) {
    throw new BadRequestError('Image does not belong to this event');
  }

  // Update caption
  const updated = await prisma.eventGalleryImage.update({
    where: { id: imageId },
    data: { caption: caption ?? null },
    include: {
      uploadedBy: {
        select: { id: true, name: true },
      },
    },
  });

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
