import express from 'express';
import { contactController } from '../controllers/contact.controller';
import { contactRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Contact form submission
router.post('/', contactRateLimiter, contactController.submitContactForm);

export default router;
