import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Upload image buffer to Catbox CDN with wsrv.nl CORS-safe caching as a reliable fallback
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
        const corsSafeUrl = `https://wsrv.nl/?url=${encodeURIComponent(cdnUrl)}`;
        const fallbackId = `fallback_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        return {
          public_id: fallbackId,
          url: corsSafeUrl,
          secure_url: corsSafeUrl,
          format: mime.split('/')[1] || 'jpg',
          bytes: buffer.length,
        };
      }
    }
  } catch (err) {
    console.warn('[Storage] Catbox fallback upload error:', err.message);
  }
  throw new Error('Image upload failed: Cloudinary is not configured and fallback storage was unreachable.');
};

/**
 * Upload an image (base64 string, data URL, or file buffer) to Cloudinary via REST API,
 * with automatic fallback to public CDN if Cloudinary credentials are not configured.
 * @param {string|Buffer} fileInput - Image data URL, base64 string, or buffer
 * @param {Object} options - Upload options (folder, mimetype, etc.)
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

  // If Cloudinary is NOT configured, use graceful fallback
  if (!cloudName || cloudName === 'your_cloud_name' || !apiKey || !apiSecret) {
    console.warn('[Storage] Cloudinary credentials missing in .env. Falling back to public CDN.');
    return await uploadToFallback(buffer, mime, options.filename || `image_${Date.now()}.jpg`);
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
    fileData = `data:${mime};base64,${fileInput.toString('base64')}`;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('file', fileData);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('[Storage] Cloudinary upload failed, using fallback:', data.error?.message);
      return await uploadToFallback(buffer, mime, options.filename || `image_${Date.now()}.jpg`);
    }

    return data;
  } catch (err) {
    console.warn('[Storage] Cloudinary request error, using fallback:', err.message);
    return await uploadToFallback(buffer, mime, options.filename || `image_${Date.now()}.jpg`);
  }
};

/**
 * Delete an image from Cloudinary using REST API
 * @param {string} publicId - Cloudinary asset public_id
 * @returns {Promise<Object>} Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || publicId.startsWith('fallback_') || publicId.startsWith('catbox_')) {
    return { result: 'ok' };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { result: 'ok' };
  }

  try {
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
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('[Storage] Delete from Cloudinary failed:', err.message);
    return { result: 'error', message: err.message };
  }
};
