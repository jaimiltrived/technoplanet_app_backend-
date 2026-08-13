import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Upload an image (base64 string, data URL, or file buffer) to Cloudinary via REST API
 * @param {string|Buffer} fileInput - Image data URL, base64 string, or buffer
 * @param {Object} options - Upload options (folder, mimetype, etc.)
 * @returns {Promise<Object>} Cloudinary API response object
 */
export const uploadToCloudinary = async (fileInput, options = {}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || cloudName === 'your_cloud_name') {
    throw new Error('CLOUDINARY_CLOUD_NAME is not configured in .env file. Please set your Cloudinary cloud name.');
  }
  if (!apiKey || !apiSecret) {
    throw new Error('CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is missing in .env file.');
  }

  const folder = options.folder || 'rku_app';
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature calculation: parameters sorted alphabetically
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  // Format buffer to Data URI if needed
  let fileData = fileInput;
  if (Buffer.isBuffer(fileInput)) {
    const mime = options.mimetype || 'image/jpeg';
    fileData = `data:${mime};base64,${fileInput.toString('base64')}`;
  }

  const formData = new URLSearchParams();
  formData.append('file', fileData);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Cloudinary image upload failed');
  }

  return data;
};

/**
 * Delete an image from Cloudinary using REST API
 * @param {string} publicId - Cloudinary asset public_id
 * @returns {Promise<Object>} Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!publicId) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  const formData = new URLSearchParams();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  return data;
};
