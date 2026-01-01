# 🚦 Rate Limiting Setup Guide

## Overview

Rate limiting has been implemented to protect the VENTECH API from abuse, DDoS attacks, and ensure fair resource usage.

## Installation

```bash
cd backend
npm install
```

The `express-rate-limit` package will be installed automatically.

## Rate Limit Tiers

### 1. Public Endpoints
- **Limit**: 100 requests/minute per IP
- **Endpoints**: 
  - `GET /api/products`
  - `GET /api/products/featured`
  - `GET /api/products/categories`
  - `GET /api/banners`
  - `GET /api/investment`
  - `GET /api/affiliate`
  - `GET /api/coupons`

### 2. Product Details
- **Limit**: 60 requests/minute per IP
- **Endpoints**: 
  - `GET /api/products/:slug`

### 3. Search
- **Limit**: 30 requests/minute per IP
- **Endpoints**: 
  - `GET /api/products?search=...`

### 4. Orders
- **Limit**: 10 requests/minute per user/IP
- **Endpoints**: 
  - `POST /api/orders`
  - `POST /api/orders/track`

### 5. Payments
- **Limit**: 5 requests/minute per user/IP
- **Endpoints**: 
  - `POST /api/payments/initialize`
  - `POST /api/payments/verify`

### 6. Uploads
- **Limit**: 20 requests/minute per user/IP
- **Endpoints**: 
  - `POST /api/upload`
  - `POST /api/upload/single`
  - `POST /api/upload/multiple`

### 7. Contact/Bulk Orders
- **Limit**: 5 requests/hour per IP
- **Endpoints**: 
  - `POST /api/contact`
  - `POST /api/bulk-orders`

### 8. Admin (Future)
- **Limit**: 100 requests/minute per admin user
- **Note**: Currently not applied (admin routes use authentication only)

## How It Works

1. **IP-based tracking**: For unauthenticated requests, rate limiting is based on IP address
2. **User-based tracking**: For authenticated requests, rate limiting is based on user ID
3. **Automatic reset**: Limits reset after the time window expires
4. **Standard headers**: Rate limit info is included in response headers

## Response Headers

When rate limited, responses include:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the limit resets (Unix timestamp)

## Error Response

When rate limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "retryAfter": 1234567890
}
```

Status Code: `429 Too Many Requests`

## Testing Rate Limits

### Test with curl
```bash
# Make multiple rapid requests
for i in {1..110}; do
  curl http://localhost:5000/api/products
  echo "Request $i"
done
```

### Test with Postman
1. Create a collection with multiple requests
2. Use Collection Runner
3. Set iterations to 110+
4. Run and observe 429 responses after limit

## Adjusting Limits

Edit `backend/src/middleware/rateLimit.middleware.ts`:

```typescript
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Time window
  max: 100, // Max requests - adjust this
  // ...
});
```

## Bypassing Rate Limits (Development)

Rate limits are automatically skipped for:
- Health check endpoint (`/health`)

To skip for other endpoints, modify the `skip` function in the rate limiter.

## Production Considerations

### Behind a Proxy
If your app is behind a proxy (nginx, load balancer), ensure:
1. `trust proxy` is enabled in Express
2. IP addresses are correctly forwarded

Add to `backend/src/app.ts`:
```typescript
app.set('trust proxy', 1);
```

### Redis for Distributed Systems
For multiple servers, consider Redis-based rate limiting:
```bash
npm install ioredis
npm install @upstash/ratelimit
```

## Monitoring

### Check Rate Limit Hits
Monitor logs for:
```
Rate limit exceeded for ip:xxx.xxx.xxx.xxx on /api/products
```

### Metrics to Track
- Number of 429 responses
- Which endpoints hit limits most
- IP addresses that frequently hit limits

## Troubleshooting

### Legitimate Users Getting Blocked
- Increase limits for specific endpoints
- Implement user-based rate limiting (already done for authenticated users)
- Whitelist specific IPs if needed

### Rate Limits Not Working
1. Check middleware is applied to routes
2. Verify `express-rate-limit` is installed
3. Check server logs for errors
4. Ensure middleware order is correct (rate limiter before route handler)

### Too Many False Positives
- Adjust limits based on actual traffic patterns
- Consider different limits for different user tiers
- Implement gradual rate limiting (warn before blocking)

## Best Practices

1. **Start Conservative**: Begin with lower limits, increase as needed
2. **Monitor Regularly**: Track rate limit hits and adjust
3. **User-Friendly Messages**: Clear error messages help users understand limits
4. **Gradual Enforcement**: Consider warning users before blocking
5. **Document Limits**: Make rate limits clear in API documentation

## Next Steps

1. Monitor rate limit hits in production
2. Adjust limits based on actual usage
3. Consider implementing Redis for distributed rate limiting
4. Add rate limit metrics to monitoring dashboard

