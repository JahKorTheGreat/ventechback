-- Migration: Optimize Featured Products Query Performance
-- This migration adds composite indexes to significantly improve featured products query performance
-- Expected improvement: 50-70% reduction in query time (from ~535ms to ~200-250ms)
-- 
-- NOTE: This migration uses 'is_featured' column (not 'featured')
-- If your schema uses 'featured' instead, replace all 'is_featured' with 'featured'

-- 1. Composite index for the most common featured products query pattern
-- This index covers: is_featured=true, in_stock=true, ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_is_featured_in_stock_created 
ON products(is_featured, in_stock, created_at DESC)
WHERE is_featured = true AND in_stock = true;

-- 2. Partial index for featured products only (smaller, faster)
-- This is more efficient than a full table index since featured products are a small subset
CREATE INDEX IF NOT EXISTS idx_products_is_featured_partial 
ON products(created_at DESC, in_stock)
WHERE is_featured = true;

-- 3. Index for pre-order exclusion (if needed)
-- If you exclude pre-orders from featured products, add this:
CREATE INDEX IF NOT EXISTS idx_products_is_featured_no_preorder 
ON products(created_at DESC)
WHERE is_featured = true AND in_stock = true AND (is_pre_order = false OR is_pre_order IS NULL);

-- Performance Notes:
-- - Partial indexes (WHERE clause) are smaller and faster than full table indexes
-- - Composite indexes allow the database to satisfy the entire query from the index
-- - The order of columns in the index matters: equality filters first, then range/order
-- - These indexes will significantly speed up the featured products endpoint

-- To verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products' AND indexname LIKE '%featured%';

