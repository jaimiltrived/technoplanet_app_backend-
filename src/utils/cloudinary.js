import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure Cloudinary SDK is initialized with env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image buffer to public storage as a fallback when Cloudinary is unavailable
 */
const uploadToFallback = async (buffer, mime = 'image/jpeg', filename = 'image.jpg') => {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([buffer], { type: mime }), filename);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form,
    });

    if (response.ok) {
      const cdnUrl = (await response.text()).trim();
      if (cdnUrl.startsWith('http')) {
        const fallbackId = `fallback_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return {
          public_id: fallbackId,
          url: cdnUrl,
          secure_url: cdnUrl,
          format: mime.split('/')[1] || 'jpg',
          bytes: buffer.length,
        };
      }
    }
  } catch (err) {
    console.warn('[Storage] Fallback upload error:', err.message);
  }
  throw new Error('Image upload failed: Cloudinary is not configured or reachable, and fallback storage was unreachable.');
};

/**
 * Upload an image (base64 string, data URL, or file buffer) to Cloudinary via the official SDK stream,
 * with automatic fallback if Cloudinary credentials are not configured.
 * @param {string|Buffer} fileInput - Image data URL, base64 string, or buffer
 * @param {Object} options - Upload options (folder, mimetype, filename, etc.)
 * @returns {Promise<Object>} Image upload response object
 */
export const uploadToCloudinary = async (fileInput, options = {}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Extract raw buffer and mime
  let buffer;
  let mime = options.mimetype || 'image/jpeg';
  if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
  } else if (typeof fileInput === 'string') {
    const matches = fileInput.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches) {
      mime = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(fileInput, 'base64');
    }
  } else {
    buffer = Buffer.from('');
  }

  // If Cloudinary is configured, use official Cloudinary SDK upload_stream
  if (cloudName && cloudName !== 'your_cloud_name' && apiKey && apiSecret) {
    try {
      const folder = options.folder || 'rku_app';
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult);
          }
        );
        stream.end(buffer);
      });
      return result;
    } catch (err) {
      console.warn('[Storage] Cloudinary SDK upload error, trying fallback:', err.message);
    }
  } else {
    console.warn('[Storage] Cloudinary credentials missing in .env. Falling back to public storage.');
  }

  return await uploadToFallback(buffer, mime, options.filename || `image_${Date.now()}.jpg`);
};

/**
 * Delete an image from Cloudinary using the official SDK
 * @param {string} publicId - Cloudinary asset public_id
 * @returns {Promise<Object>} Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || publicId.startsWith('fallback_') || publicId.startsWith('catbox_')) {
    return { result: 'ok' };
  }

  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[Storage] Delete from Cloudinary failed:', err.message);
    return { result: 'error', message: err.message };
  }
};
