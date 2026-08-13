import { Router } from 'express';
import { uploadImage, deleteImage } from '../controllers/upload.controller.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Apply authentication to upload routes
router.use(authenticate);

// Upload single image route
router.post('/image', uploadSingleImage('image'), uploadImage);

// Delete image route
router.delete('/image', deleteImage);

export default router;
