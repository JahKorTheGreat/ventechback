import express from 'express';
import { bulkOrderController } from '../controllers/bulkOrder.controller';
import { contactRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Bulk order request submission
router.post('/', contactRateLimiter, bulkOrderController.submitBulkOrderRequest);

export default router;

