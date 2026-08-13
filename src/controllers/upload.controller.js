import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError } from '../utils/customErrors.js';
import { sendResponse } from '../utils/response.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

/**
 * @desc Upload a single image file or base64 data to Cloudinary
 * @route POST /api/upload/image or /api/v1/upload/image
 */
export const uploadImage = asyncHandler(async (req, res, next) => {
  const fileInput = req.file ? req.file.buffer : (req.body.image || req.body.file);

  if (!fileInput) {
    throw new BadRequestError('No image file or base64 image data provided');
  }

  const folder = req.body.folder || 'rku_app/general';
  const mimetype = req.file?.mimetype;

  const result = await uploadToCloudinary(fileInput, {
    folder,
    mimetype
  });

  return sendResponse(res, 201, 'Image uploaded successfully to Cloudinary', {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes
  });
});

/**
 * @desc Delete an image from Cloudinary by publicId
 * @route DELETE /api/upload/image or /api/v1/upload/image
 */
export const deleteImage = asyncHandler(async (req, res, next) => {
  const { publicId } = req.body;

  if (!publicId) {
    throw new BadRequestError('publicId is required to delete image from Cloudinary');
  }

  const result = await deleteFromCloudinary(publicId);

  return sendResponse(res, 200, 'Image deleted successfully from Cloudinary', result);
});
