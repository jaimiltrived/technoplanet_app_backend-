import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/response.js';

/**
 * @desc Get all gallery images
 * @route GET /api/gallery
 */
const getGallery = asyncHandler(async (req, res, next) => {
  const { year } = req.query;

  const galleryItems = await prisma.gallery.findMany({
    where: year ? { year: Number(year) } : {},
    orderBy: { year: 'desc' }
  });

  return sendResponse(res, 200, 'Gallery retrieved successfully', galleryItems);
});

/**
 * @desc Get gallery images by year/event
 * @route GET /api/gallery/:year
 */
const getGalleryByYear = asyncHandler(async (req, res, next) => {
  const { year } = req.params;

  const galleryItems = await prisma.gallery.findMany({
    where: { year: Number(year) },
    orderBy: { createdAt: 'desc' }
  });

  return sendResponse(res, 200, `Gallery for year ${year} retrieved successfully`, galleryItems);
});

export {
  getGallery,
  getGalleryByYear
};
