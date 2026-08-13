import { Router } from 'express';
import { getGallery, getGalleryByYear } from '../controllers/gallery.controller.js';

const router = Router();

// Public routes for previous year event gallery
router.get('/', getGallery);
router.get('/:year', getGalleryByYear);

export default router;
