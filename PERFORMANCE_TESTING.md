# 🚀 Performance Testing Guide

## Overview

This guide explains how to run performance tests for the VENTECH backend API using Artillery.

## Prerequisites

1. **Install Artillery** (globally or locally):
   ```bash
   npm install -g artillery
   # OR
   npm install --save-dev artillery
   ```

2. **Backend must be running**:
   ```bash
   cd backend
   npm run dev
   # OR in production
   npm start
   ```

## Running Tests

### Basic Test
```bash
cd backend
npx artillery run artillery.yml
```

### Test Against Production
```bash
npx artillery run artillery.yml --target https://your-api-domain.com
```

### Generate HTML Report
```bash
npx artillery run artillery.yml --output report.json
npx artillery report report.json
```

## Test Scenarios

### 1. Browse Products (40% of traffic)
- GET `/api/products`
- GET `/api/products?page=2`
- Simulates normal browsing

### 2. View Product Details (30% of traffic)
- GET `/api/products` (to get a product slug)
- GET `/api/products/:slug`
- Simulates product detail page views

### 3. Search Products (20% of traffic)
- GET `/api/products?search=laptop`
- GET `/api/products?search=phone`
- Simulates search functionality

### 4. Featured Products (10% of traffic)
- GET `/api/products/featured`
- Simulates homepage featured products

## Test Phases

1. **Warm-up** (30 seconds)
   - 2 requests/second
   - Gradually increases load

2. **Normal Load** (60 seconds)
   - 10 requests/second
   - Simulates normal traffic

3. **Peak Load** (30 seconds)
   - 20 requests/second
   - Simulates peak traffic

4. **Cool Down** (30 seconds)
   - 5 requests/second
   - Gradually decreases load

## Understanding Results

### Key Metrics

- **Request Rate**: Requests per second
- **Response Time**: p50, p95, p99 percentiles
- **Success Rate**: Percentage of successful requests
- **Errors**: Number and types of errors

### Target Metrics

- **Response Time (p95)**: < 500ms
- **Success Rate**: > 99%
- **Error Rate**: < 1%

## Customizing Tests

### Modify Load
Edit `artillery.yml`:
```yaml
phases:
  - duration: 60
    arrivalRate: 50  # Increase to 50 req/s
```

### Add New Scenarios
Add to `scenarios` section:
```yaml
- name: "New Scenario"
  flow:
    - get:
        url: "/api/your-endpoint"
```

### Test Specific Endpoints
```bash
npx artillery quick --count 100 --num 10 http://localhost:5000/api/products
```

## Advanced Testing

### Stress Test
```yaml
phases:
  - duration: 60
    arrivalRate: 100  # High load
    name: "Stress test"
```

### Spike Test
```yaml
phases:
  - duration: 10
    arrivalRate: 200  # Sudden spike
    name: "Spike test"
```

### Endurance Test
```yaml
phases:
  - duration: 3600  # 1 hour
    arrivalRate: 10
    name: "Endurance test"
```

## Monitoring During Tests

### Check Server Logs
```bash
pm2 logs ventech-backend
```

### Monitor Database
- Check Supabase dashboard for query performance
- Monitor connection pool usage

### Check System Resources
```bash
# CPU and Memory
top
# OR
htop

# Network
iftop
```

## Troubleshooting

### Tests Fail Immediately
- Check if backend is running
- Verify target URL is correct
- Check firewall/network settings

### High Error Rate
- Check backend logs
- Verify database connection
- Check rate limiting (might be too strict)

### Slow Response Times
- Check database query performance
- Verify indexes are in place
- Check for N+1 query problems

## Best Practices

1. **Start Small**: Begin with low load, gradually increase
2. **Monitor Resources**: Watch CPU, memory, database
3. **Test Realistic Scenarios**: Match actual user behavior
4. **Run Regularly**: Performance test before major releases
5. **Document Results**: Keep track of performance over time

## Next Steps

After performance testing:
1. Identify bottlenecks
2. Optimize slow endpoints
3. Add caching if needed
4. Scale infrastructure if required
5. Re-test to verify improvements

