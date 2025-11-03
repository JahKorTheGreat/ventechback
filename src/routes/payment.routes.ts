import express from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = express.Router();
const paymentController = new PaymentController();

// Initialize Paystack transaction
router.post('/initialize', paymentController.initializeTransaction);

// Verify Paystack transaction
router.post('/verify', paymentController.verifyTransaction);

// Update transaction-order link (for linking after order creation)
router.post('/update-order-link', paymentController.updateOrderLink);

export default router;

