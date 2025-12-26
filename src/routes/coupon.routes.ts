import express from 'express';
import { CouponController } from '../controllers/coupon.controller';

const router = express.Router();
const couponController = new CouponController();

// Public endpoints
router.post('/validate', couponController.validateCoupon.bind(couponController));
router.post('/record-usage', couponController.recordCouponUsage.bind(couponController));

// Admin endpoints
router.get('/', couponController.getAllCoupons.bind(couponController));
router.get('/:id', couponController.getCouponById.bind(couponController));
router.post('/', couponController.createCoupon.bind(couponController));
router.patch('/:id', couponController.updateCoupon.bind(couponController));
router.delete('/:id', couponController.deleteCoupon.bind(couponController));

export default router;

