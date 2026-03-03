// src/routes/affiliate.routes.ts

import express from 'express';
import { affiliateController } from '../controllers/affiliate.controller';
import { authenticate, requireAffiliate } from '../middleware/auth.middleware';

const router = express.Router();

// Public endpoint - affiliate application submission
router.post('/', affiliateController.submitAffiliateApplication.bind(affiliateController));

// Protected routes - require authentication and active affiliate status
router.use(authenticate, requireAffiliate);

// Dashboard routes
router.get(
  '/dashboard/stats',
  affiliateController.getDashboardStats.bind(affiliateController)
);
router.get(
  '/dashboard/chart-data',
  affiliateController.getChartData.bind(affiliateController)
);
router.get(
  '/dashboard/recent-earnings',
  affiliateController.getRecentEarnings.bind(affiliateController)
);

// Referral links routes
router.get('/links', affiliateController.getLinks.bind(affiliateController));
router.post('/links', affiliateController.createLink.bind(affiliateController));
router.delete('/links/:id', affiliateController.deleteLink.bind(affiliateController));

// Earnings routes
router.get('/earnings', affiliateController.getEarnings.bind(affiliateController));
router.get('/earnings/summary', affiliateController.getEarningsSummary.bind(affiliateController));

// Payouts routes
router.get('/payouts', affiliateController.getPayouts.bind(affiliateController));
router.post('/payouts/request', affiliateController.requestPayout.bind(affiliateController));

// Payment methods routes
router.get(
  '/payment-methods',
  affiliateController.getPaymentMethods.bind(affiliateController)
);
router.post(
  '/payment-methods',
  affiliateController.addPaymentMethod.bind(affiliateController)
);
router.delete(
  '/payment-methods/:id',
  affiliateController.deletePaymentMethod.bind(affiliateController)
);

// Products route
router.get('/products', affiliateController.getProducts.bind(affiliateController));

export default router;