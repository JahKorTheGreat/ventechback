import { Router, Request, Response, NextFunction } from 'express';
import {
  getAllProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
} from '../controllers/product.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';
import { 
  publicRateLimiter, 
  productDetailsRateLimiter,
  searchRateLimiter 
} from '../middleware/rateLimit.middleware';

const router = Router();

// Middleware to apply search rate limiter if search query is present
const applySearchRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (req.query.search) {
    return searchRateLimiter(req, res, next);
  } else {
    return publicRateLimiter(req, res, next);
  }
};

// Public routes with rate limiting
router.get('/', applySearchRateLimit, getAllProducts);
router.get('/featured', publicRateLimiter, getFeaturedProducts);
router.get('/categories', publicRateLimiter, getAllCategories);
router.get('/:slug', productDetailsRateLimiter, getProductBySlug);

// Admin routes
router.post('/', authenticate, isAdmin, createProduct);
router.put('/:id', authenticate, isAdmin, updateProduct);
router.delete('/:id', authenticate, isAdmin, deleteProduct);

export default router;



