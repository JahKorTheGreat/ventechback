# 🚀 Performance Testing Guide - Updated

## Important: Rate Limiting During Tests

**Rate limiting is working correctly!** The 429 errors you're seeing are expected when running performance tests that exceed the rate limits.

## Two Options for Performance Testing

### Option 1: Disable Rate Limiting (Recommended for Testing)

1. **Set environment variable:**
   ```bash
   # In backend/.env or when starting server
   DISABLE_RATE_LIMIT=true
   ```

2. **Start backend with rate limiting disabled:**
   ```bash
   cd backend
   DISABLE_RATE_LIMIT=true npm run dev
   ```

3. **Run performance tests:**
   ```bash
   npx artillery run artillery.yml
   ```

### Option 2: Increase Rate Limits for Testing

1. **Set higher rate limits in environment:**
   ```bash
   # In backend/.env
   RATE_LIMIT_PUBLIC=10000
   RATE_LIMIT_SEARCH=5000
   RATE_LIMIT_PRODUCT_DETAILS=5000
   ```

2. **Restart backend:**
   ```bash
   npm run build
   npm run dev
   ```

3. **Run tests:**
   ```bash
   npx artillery run artillery.yml
   ```

### Option 3: Use Performance Test Config (Accepts 429)

Use the new `artillery-performance.yml` which accepts both 200 and 429 as valid responses:

```bash
npx artillery run artillery-performance.yml
```

This config:
- Accepts 429 responses as valid (rate limiting is working)
- Still measures performance of successful requests
- Shows how rate limiting affects performance

## Understanding the Results

### When Rate Limiting is Active

- **429 responses are expected** when exceeding limits
- This shows rate limiting is **working correctly**
- Performance metrics will show:
  - Response times for successful requests (200)
  - Rate limit hits (429)
  - Overall system behavior under load

### What to Look For

1. **Response Times (p95, p99)**: Should be < 500ms for successful requests
2. **Success Rate**: Will be lower due to rate limits (this is expected)
3. **Rate Limit Headers**: Check `ratelimit-remaining` to see limit status
4. **System Stability**: Server should remain stable even with rate limits

## Recommended Testing Workflow

### Step 1: Test with Rate Limiting (Current Behavior)
```bash
# Normal rate limits active
npm run dev

# Run tests - expect some 429s
npx artillery run artillery.yml
```

**Purpose**: Verify rate limiting works and doesn't break the system

### Step 2: Test Performance Without Rate Limiting
```bash
# Disable rate limiting
DISABLE_RATE_LIMIT=true npm run dev

# Run tests - should get all 200s
npx artillery run artillery.yml
```

**Purpose**: Measure actual API performance without rate limit interference

### Step 3: Compare Results

- **With rate limits**: Shows protection is working
- **Without rate limits**: Shows actual API performance
- **Both are important metrics**

## Environment Variables

Add to `backend/.env`:

```env
# Disable rate limiting completely (for testing only!)
DISABLE_RATE_LIMIT=false

# Or increase limits for testing
RATE_LIMIT_PUBLIC=10000
RATE_LIMIT_SEARCH=5000
RATE_LIMIT_PRODUCT_DETAILS=5000
RATE_LIMIT_ORDER=1000
RATE_LIMIT_PAYMENT=500
RATE_LIMIT_UPLOAD=500
```

## Production vs Testing

### Production
- Rate limits: **ENABLED** (protect API)
- `DISABLE_RATE_LIMIT=false` or not set

### Testing
- Rate limits: **DISABLED** or **INCREASED** (measure performance)
- `DISABLE_RATE_LIMIT=true` or set high limits

## Quick Test Commands

```bash
# Test 1: With rate limiting (expect 429s after limits)
npm run dev
npx artillery run artillery.yml

# Test 2: Without rate limiting (all 200s)
DISABLE_RATE_LIMIT=true npm run dev
npx artillery run artillery.yml

# Test 3: Accept 429s as valid (performance with rate limiting)
npm run dev
npx artillery run artillery-performance.yml
```

## Summary

✅ **Rate limiting is working correctly** - the 429 errors prove it!

For performance testing:
- **Option A**: Disable rate limiting (`DISABLE_RATE_LIMIT=true`)
- **Option B**: Increase limits significantly
- **Option C**: Use `artillery-performance.yml` which accepts 429s

The choice depends on what you want to measure:
- **System protection**: Keep rate limits (expect 429s)
- **API performance**: Disable rate limits (all 200s)
- **Both**: Use performance config (accepts both)

