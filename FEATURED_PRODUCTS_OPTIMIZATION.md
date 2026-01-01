# Featured Products Endpoint Optimization Plan

## Current Performance Issues

Based on Artillery performance tests:
- **Mean response time**: 535.7ms (2x slower than other endpoints)
- **p95 latency**: 713.5ms
- **p99 latency**: 1002.4ms
- **Max latency**: 1,934ms

## Root Causes Identified

1. **Missing Composite Index**: Query filters by `featured=true`, `in_stock=true`, and orders by `created_at DESC` - no composite index covers this pattern
2. **Selecting All Columns**: Using `select('*')` fetches unnecessary data
3. **No Caching**: Featured products are fetched fresh on every request
4. **Inefficient Query Pattern**: Two separate queries (try/catch fallback) adds overhead

## Optimization Strategy

### Phase 1: Database Indexes (Immediate Impact - 50-70% improvement)

**Priority: HIGH** - Expected improvement: 535ms → 200-250ms

1. **Composite Index** for the query pattern:
   ```sql
   CREATE INDEX idx_products_featured_in_stock_created 
   ON products(featured, in_stock, created_at DESC)
   WHERE featured = true AND in_stock = true;
   ```

2. **Partial Index** for featured products only:
   ```sql
   CREATE INDEX idx_products_featured_partial 
   ON products(created_at DESC, in_stock)
   WHERE featured = true;
   ```

**Why this works:**
- Partial indexes are smaller and faster (only index rows where `featured=true`)
- Composite index covers all filter conditions + ordering
- Database can satisfy query entirely from index (no table scan)

### Phase 2: Query Optimization (Additional 20-30% improvement)

**Priority: MEDIUM** - Expected improvement: 200ms → 150-180ms

1. **Select Only Needed Columns**:
   ```typescript
   .select('id, name, slug, description, thumbnail, images, original_price, discount_price, rating, review_count, created_at')
   ```

2. **Remove Fallback Query Pattern**:
   - Check schema once at startup
   - Use correct column name consistently
   - Eliminate try/catch overhead

3. **Add Query Hints** (if using PostgreSQL directly):
   ```sql
   SET enable_seqscan = off; -- Force index usage
   ```

### Phase 3: Caching Layer (Additional 40-50% improvement for cached requests)

**Priority: MEDIUM** - Expected improvement: 150ms → 5-10ms (cached)

1. **In-Memory Cache** (Node.js):
   ```typescript
   let featuredProductsCache = {
     data: null,
     timestamp: null,
     ttl: 5 * 60 * 1000 // 5 minutes
   };
   ```

2. **Redis Cache** (Production):
   - Cache key: `featured_products:${limit}`
   - TTL: 5 minutes
   - Invalidate on product update/create

3. **Cache Strategy**:
   - Cache on first request
   - Serve from cache for subsequent requests
   - Invalidate when:
     - Product is marked/unmarked as featured
     - Product stock status changes
     - New product is created

### Phase 4: Advanced Optimizations (Additional 10-20% improvement)

**Priority: LOW** - Expected improvement: 150ms → 130-140ms

1. **Database Connection Pooling**:
   - Ensure proper pool size
   - Reuse connections

2. **Query Result Pagination**:
   - Limit results to what's needed
   - Don't fetch more than requested

3. **Response Compression**:
   - Enable gzip compression
   - Reduce payload size

## Implementation Steps

### Step 1: Database Migration (5 minutes)
```bash
# Run the migration
psql -U postgres -d your_database -f backend/migrations/optimize_featured_products.sql
```

### Step 2: Update Controller (10 minutes)
- Update `getFeaturedProducts` in `backend/src/controllers/product.controller.ts`
- Select only needed columns
- Remove fallback query pattern
- Add basic in-memory cache

### Step 3: Add Caching (15 minutes)
- Implement in-memory cache
- Add cache invalidation logic
- Optional: Add Redis for production

### Step 4: Test & Monitor (10 minutes)
- Run Artillery tests again
- Compare before/after metrics
- Monitor in production

## Expected Results

### Before Optimization:
- Mean: 535.7ms
- p95: 713.5ms
- p99: 1002.4ms

### After Phase 1 (Indexes Only):
- Mean: ~200-250ms (53-63% improvement)
- p95: ~300-350ms
- p99: ~400-500ms

### After Phase 2 (Query Optimization):
- Mean: ~150-180ms (66-72% improvement)
- p95: ~220-250ms
- p99: ~300-350ms

### After Phase 3 (Caching):
- Mean: ~5-10ms (cached) / ~150ms (cache miss) (98% improvement for cached)
- p95: ~10-15ms (cached) / ~220ms (cache miss)
- p99: ~20-30ms (cached) / ~300ms (cache miss)

## Monitoring & Validation

### Key Metrics to Track:
1. Response time percentiles (p50, p95, p99)
2. Cache hit rate (if caching implemented)
3. Database query execution time
4. Error rate

### Validation Queries:
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE 
SELECT * FROM products 
WHERE featured = true AND in_stock = true 
ORDER BY created_at DESC 
LIMIT 8;

-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'products' AND indexname LIKE '%featured%';
```

## Rollback Plan

If optimizations cause issues:

1. **Remove indexes**:
   ```sql
   DROP INDEX IF EXISTS idx_products_featured_in_stock_created;
   DROP INDEX IF EXISTS idx_products_featured_partial;
   DROP INDEX IF EXISTS idx_products_featured_no_preorder;
   ```

2. **Revert controller changes**: Use git to revert to previous version

3. **Disable caching**: Set cache TTL to 0 or remove cache logic

## Next Steps

1. ✅ Review this plan
2. ⏳ Run database migration
3. ⏳ Update controller code
4. ⏳ Implement caching
5. ⏳ Run performance tests
6. ⏳ Deploy to production
7. ⏳ Monitor results

