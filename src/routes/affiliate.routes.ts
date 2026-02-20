import express from 'express';
import { affiliateController } from '../controllers/affiliate.controller';
import { publicRateLimiter, affiliateRateLimiter } from '../middleware/rateLimit.middleware';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * PUBLIC ROUTES (No authentication required)
 */

// Submit affiliate application (public, rate limited)
router.post('/', publicRateLimiter, affiliateController.submitAffiliateApplication.bind(affiliateController));

/**
 * AUTHENTICATED AFFILIATE ROUTES (Affiliate-specific)
 */

// Get my affiliate dashboard
router.get('/dashboard/me', authenticate, affiliateRateLimiter, affiliateController.getAffiliateDashboard.bind(affiliateController));

// Get my commission history
router.get('/commissions/history', authenticate, affiliateRateLimiter, affiliateController.getCommissionHistory.bind(affiliateController));

/**
 * ADMIN ROUTES (Admin-only endpoints)
 */

// List all affiliates
router.get('/admin/list', authenticate, isAdmin, affiliateRateLimiter, affiliateController.listAffiliates.bind(affiliateController));

// Get affiliate system analytics
router.get('/admin/analytics', authenticate, isAdmin, affiliateRateLimiter, affiliateController.getAnalytics.bind(affiliateController));

// Approve an affiliate application
router.post('/admin/approve/:affiliateId', authenticate, isAdmin, affiliateRateLimiter, affiliateController.approveAffiliate.bind(affiliateController));

// Reject an affiliate application
router.post('/admin/reject/:affiliateId', authenticate, isAdmin, affiliateRateLimiter, affiliateController.rejectAffiliate.bind(affiliateController));

// Suspend an affiliate
router.post('/admin/suspend/:affiliateId', authenticate, isAdmin, affiliateRateLimiter, affiliateController.suspendAffiliate.bind(affiliateController));

// Reactivate a suspended affiliate
router.post('/admin/reactivate/:affiliateId', authenticate, isAdmin, affiliateRateLimiter, affiliateController.reactivateAffiliate.bind(affiliateController));

export default router;

