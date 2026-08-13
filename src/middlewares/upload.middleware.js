import { BadRequestError } from '../utils/customErrors.js';

let multer;
try {
  multer = (await import('multer')).default;
} catch (e) {
  multer = null;
}

// Memory storage for multer if installed
const storage = multer ? multer.memoryStorage() : null;

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'), false);
  }
};

export const uploadSingleImage = (fieldName = 'image', maxSizeMB = 5) => {
  if (multer) {
    return multer({
      storage,
      fileFilter: imageFileFilter,
      limits: { fileSize: maxSizeMB * 1024 * 1024 }
    }).single(fieldName);
  }

  // Fallback middleware if multer is not present: accepts base64 or URL input in req.body
  return (req, res, next) => {
    next();
  };
};

export const uploadMultipleImages = (fieldName = 'images', maxCount = 5, maxSizeMB = 5) => {
  if (multer) {
    return multer({
      storage,
      fileFilter: imageFileFilter,
      limits: { fileSize: maxSizeMB * 1024 * 1024 }
    }).array(fieldName, maxCount);
  }

  return (req, res, next) => {
    next();
  };
};
