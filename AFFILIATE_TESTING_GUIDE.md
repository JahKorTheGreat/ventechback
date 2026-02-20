# Affiliate System - Testing & Validation Guide

## Quick Start Testing

### Prerequisites
✅ All 5 database migrations executed
✅ Environment variables configured
✅ Backend running and accessible
✅ Bearer token from test user with admin role

---

## Test Scenario 1: Affiliate Application Submission

### Test 1.1: Submit Application (Public)
```bash
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Tech Reviewer",
    "email": "john@techblog.com",
    "phone": "+233 55 123 4567",
    "type": "individual",
    "promotionChannel": "YouTube",
    "platformLink": "https://youtube.com/@techtalk",
    "country": "Ghana"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Affiliate application submitted successfully! We'll review your application and get back to you soon."
}
```

**Verify in Database:**
```sql
SELECT id, full_name, email, status FROM affiliates 
WHERE email = 'john@techblog.com';
-- Should return: status = 'pending'
```

### Test 1.2: Same Email Duplicate (Should Fail)
```bash
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Tech Reviewer",
    "email": "john@techblog.com",
    ...  # same data
  }'
```

**Expected:** 
- Database constraint error OR
- Success but second record (depends on implementation)

---

## Test Scenario 2: Admin Approval Workflow

### Test 2.1: List Pending Applications (Admin)
```bash
curl -X GET "http://localhost:3001/api/affiliate/admin/list?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "full_name": "John Tech Reviewer",
      "email": "john@techblog.com",
      "status": "pending",
      "type": "individual",
      "created_at": "2026-02-20T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Test 2.2: Approve Application (Admin)
```bash
AFFILIATE_ID="uuid-1"  # From list response

curl -X POST "http://localhost:3001/api/affiliate/admin/approve/${AFFILIATE_ID}" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Affiliate approved successfully",
  "data": {
    "affiliate": {
      "id": "uuid-1",
      "status": "active",
      "commission_tier": 3,
      "approved_at": "2026-02-20T10:05:00Z",
      "approved_by": "admin-user-id"
    },
    "referral": {
      "id": "uuid-ref-1",
      "affiliate_id": "uuid-1",
      "referral_code": "AFFY-UUID1234-ABC123",
      "referral_type": "code"
    }
  }
}
```

**Verify in Database:**
```sql
-- Affiliate status changed
SELECT id, status, commission_tier, approved_at FROM affiliates 
WHERE id = 'uuid-1';
-- Should return: status = 'active', commission_tier = 3

-- Referral code created
SELECT referral_code, referral_type FROM affiliate_referrals 
WHERE affiliate_id = 'uuid-1';
-- Should return: referral_code = 'AFFY-UUID1234-ABC123'
```

### Test 2.3: Reject Application (Admin)
```bash
# First create another test affiliate
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Rejected Affiliate",
    "email": "rejected@example.com",
    "phone": "+233 55 999 9999",
    "type": "individual",
    "promotionChannel": "Blog",
    "platformLink": "https://blog.example.com",
    "country": "Ghana"
  }'

# Get the ID
AFFILIATE_ID="uuid-2"

# Reject it
curl -X POST "http://localhost:3001/api/affiliate/admin/reject/${AFFILIATE_ID}" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "Platform not suitable for our products"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Affiliate rejected successfully",
  "data": {
    "id": "uuid-2",
    "status": "rejected",
    "rejection_reason": "Platform not suitable for our products"
  }
}
```

---

## Test Scenario 3: Order Creation with Referral Code

### Prerequisites
- Need an approved affiliate with referral code
- From Test 2.2: `AFFY-UUID1234-ABC123`
- Need a customer user ID

### Test 3.1: Create Order with Referral Code
```bash
REFERRAL_CODE="AFFY-UUID1234-ABC123"
CUSTOMER_ID="customer-user-id"

curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "'${CUSTOMER_ID}'",
    "order_items": [
      {
        "product_id": "product-123",
        "product_name": "Test Product",
        "quantity": 2,
        "unit_price": 250,
        "subtotal": 500
      }
    ],
    "subtotal": 500,
    "tax": 0,
    "delivery_fee": 30,
    "discount": 0,
    "total": 530,
    "payment_method": "cash_on_delivery",
    "delivery_address": {
      "recipient_name": "John Doe",
      "recipient_number": "+233 55 123 4567",
      "recipient_location": "Accra",
      "recipient_region": "Greater Accra"
    },
    "referral_code": "'${REFERRAL_CODE}'"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-uuid",
    "order_number": "ORD-00001",
    "total": 530,
    "payment_status": "pending",
    "affiliate_commission": {
      "id": "commission-uuid",
      "affiliate_id": "uuid-1",
      "order_id": "order-uuid",
      "commission_amount": 15.90,  // 530 * 3% = 15.9
      "commission_rate": 3,
      "referral_type": "code",
      "status": "pending"
    }
  }
}
```

**Verify in Database:**
```sql
-- Commission record created
SELECT id, status, commission_amount, commission_rate FROM affiliate_commissions 
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'ORD-00001');
-- Should return: status = 'pending', commission_amount = 15.90, rate = 3

-- Affiliate's pending commissions increased
SELECT SUM(commission_amount) as total_pending FROM affiliate_commissions 
WHERE affiliate_id = 'uuid-1' AND status = 'pending';
-- Should return: 15.90
```

---

## Test Scenario 4: Payment Confirmation and Commission Earning

### Test 4.1: Verify Payment (Paystack)
```bash
# Simulate Paystack verification (would come from frontend after payment)
curl -X POST http://localhost:3001/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "paystack-ref-12345"
  }'
```

**Expected in Response/Database:**
```sql
-- Transaction updated
SELECT payment_status FROM transactions 
WHERE paystack_reference = 'paystack-ref-12345';
-- Should return: payment_status = 'paid'

-- Order payment status updated
SELECT payment_status FROM orders 
WHERE id = 'order-uuid';
-- Should return: payment_status = 'paid'

-- Commission status changed to EARNED
SELECT status, earned_at FROM affiliate_commissions 
WHERE order_id = 'order-uuid';
-- Should return: status = 'earned', earned_at = now()
```

### Test 4.2: Test Tier Escalation (Multiple Orders)

**Setup:** Create multiple orders with referral code until affiliate reaches next tier

```bash
# Create 99 more orders with same referral code
for i in {2..100}; do
  curl -X POST http://localhost:3001/api/orders \
    -H "Content-Type: application/json" \
    -d '{
      "order_items": [{"product_id": "p'${i}'", "quantity": 1, "unit_price": 100}],
      "subtotal": 100,
      "total": 100,
      "delivery_fee": 0,
      "referral_code": "AFFY-UUID1234-ABC123",
      ...
    }'
  
  # Simulate payment for each order
  echo "Order $i created"
done

# After 100 orders, next order should use 5% commission
# (100 falls into Silver tier: 100-499 orders)
```

**Verify Tier Change:**
```sql
-- Count successful orders from last 90 days
SELECT COUNT(*) as order_count FROM affiliate_commissions 
WHERE affiliate_id = 'uuid-1' AND status = 'earned' 
AND earned_at >= NOW() - INTERVAL '90 days';
-- Should return: 100

-- Query current tier for affiliate
SELECT commission_tier FROM affiliates WHERE id = 'uuid-1';
-- Should return: 5 (if recently processed) or 3 (if calculated on demand)

-- Next order should have 5% commission
SELECT commission_rate FROM affiliate_commissions 
WHERE affiliate_id = 'uuid-1' 
ORDER BY created_at DESC LIMIT 1;
-- Should return: 5
```

---

## Test Scenario 5: Affiliate Dashboard

### Test 5.1: Get Dashboard Data (Authenticated Affiliate)
```bash
# First, link affiliate to user account
# (In real scenario, affiliate submits with email that matches user email)

curl -X GET http://localhost:3001/api/affiliate/dashboard/me \
  -H "Authorization: Bearer <AFFILIATE_USER_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "affiliate": {
      "id": "uuid-1",
      "full_name": "John Tech Reviewer",
      "status": "active",
      "commission_tier": 5,
      "performance_metrics": {
        "total_referrals": 100,
        "successful_referrals": 100,
        "Click_count": 0,
        "conversion_count": 100,
        "total_commission_earned": 5000
      }
    },
    "earnings": {
      "totalEarned": 5000.00,     // All earned + paid
      "totalPending": 0.00,        // Awaiting payment
      "totalPaid": 0.00            // Already paid out
    },
    "referralCodes": [
      {
        "id": "ref-uuid",
        "referral_code": "AFFY-UUID1234-ABC123",
        "click_count": 0,
        "conversion_count": 100
      }
    ],
    "performance": {
      "conversions90Days": 100,
      "currentTier": 5
    }
  }
}
```

### Test 5.2: Get Commission History
```bash
curl -X GET "http://localhost:3001/api/affiliate/commissions/history?page=1&limit=10&status=earned" \
  -H "Authorization: Bearer <AFFILIATE_USER_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "commission-uuid",
      "commission_amount": 15.90,
      "commission_rate": 3,
      "status": "earned",
      "earned_at": "2026-02-20T11:00:00Z",
      "orders": {
        "order_number": "ORD-00001"
      },
      "transactions": {
        "status": "paid"
      }
    },
    ...
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## Test Scenario 6: Admin Analytics

### Test 6.1: Get System Analytics (Admin)
```bash
curl -X GET http://localhost:3001/api/affiliate/admin/analytics \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "affiliateStats": {
      "total": 2,
      "active": 1,
      "pending": 0,
      "suspended": 0,
      "rejected": 1
    },
    "commissions": {
      "totalEarned": 5000.00,      // Sum of all earned commissions
      "totalPending": 0.00         // Sum of pending
    },
    "payouts": {
      "totalPaid": 0.00            // Sum of completed payouts
    }
  }
}
```

---

## Test Scenario 7: Suspension & Reactivation

### Test 7.1: Suspend Affiliate
```bash
AFFILIATE_ID="uuid-1"

curl -X POST "http://localhost:3001/api/affiliate/admin/suspend/${AFFILIATE_ID}" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Non-compliant content policy"
  }'
```

**Expected:**
- Status updated to 'suspended'
- New orders with this affiliate's code won't create commissions

### Test 7.2: Reactivate Affiliate
```bash
curl -X POST "http://localhost:3001/api/affiliate/admin/reactivate/${AFFILIATE_ID}" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected:**
- Status updated back to 'active'
- New orders with affiliate's code create commissions again

---

## Error Scenarios to Test

### Test 8.1: Invalid Referral Code
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "referral_code": "AFFY-INVALID-000000",
    ...  # other order data
  }'
```

**Expected:**
- Order created successfully
- No affiliate_commission record created
- Console logs: "No affiliate commission created for this order"

### Test 8.2: Missing Required Fields
```bash
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "test@example.com"
    # Missing: phone, type, promotionChannel, platformLink, country
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Missing required fields: fullName, email, phone, country, promotionChannel, platformLink, and type are required"
}
```

### Test 8.3: Invalid Email Format
```bash
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "invalid-email",
    ...
  }'
```

**Expected:**
```json
{
  "success": false,
  "message": "Invalid email format"
}
```

### Test 8.4: Invalid Affiliate Type
```bash
curl -X POST http://localhost:3001/api/affiliate/ \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test",
    "email": "test@example.com",
    "type": "invalid",
    ...
  }'
```

**Expected:**
```json
{
  "success": false,
  "message": "Invalid type. Must be \"individual\" or \"company\""
}
```

---

## Database Inspection Queries

```sql
-- View all affiliates
SELECT id, full_name, email, status, commission_tier, created_at 
FROM affiliates 
ORDER BY created_at DESC;

-- View all referral codes
SELECT ar.*, a.full_name FROM affiliate_referrals ar
JOIN affiliates a ON ar.affiliate_id = a.id
WHERE ar.referral_type = 'code';

-- View commission summary
SELECT 
  a.full_name,
  COUNT(*) as total_commissions,
  SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END) as pending,
  SUM(CASE WHEN ac.status = 'earned' THEN ac.commission_amount ELSE 0 END) as earned,
  SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END) as paid
FROM affiliate_commissions ac
JOIN affiliates a ON ac.affiliate_id = a.id
GROUP BY a.id, a.full_name;

-- View commission tiers
SELECT * FROM affiliate_commission_tiers 
ORDER BY min_orders ASC;

-- Check for tier escalation
SELECT 
  a.id, a.full_name,
  COUNT(ac.id) as earned_orders_90days,
  a.commission_tier,
  CASE 
    WHEN COUNT(ac.id) >= 500 THEN 7
    WHEN COUNT(ac.id) >= 100 THEN 5
    ELSE 3
  END as next_tier
FROM affiliates a
LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id 
  AND ac.status = 'earned' 
  AND ac.earned_at >= NOW() - INTERVAL '90 days'
GROUP BY a.id, a.full_name, a.commission_tier;
```

---

## Performance Testing

### Test 9.1: Rate Limiting
```bash
# Try to exceed rate limit (30 requests/min for affiliates)
for i in {1..35}; do
  curl -X GET http://localhost:3001/api/affiliate/dashboard/me \
    -H "Authorization: Bearer <TOKEN>" &
done

# Last few requests should return 429 Too Many Requests
```

### Test 9.2: High Volume Order Processing
```bash
# Create 100 orders with affiliate code simultaneously
# Measure response time and verify all commissions created
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/orders \
    -H "Content-Type: application/json" \
    -d '{...}' &
done
```

---

## Sign-Off Checklist

- [ ] All 5 database migrations executed successfully
- [ ] Affiliate application submission creates database record
- [ ] Admin can view pending applications
- [ ] Admin can approve/reject applications
- [ ] Approved affiliate gets referral code
- [ ] Orders with referral code create commissions (pending)
- [ ] Payment confirmation marks commissions as earned
- [ ] Affiliate can view dashboard with earnings
- [ ] Affiliate can view commission history
- [ ] Tier escalation works at tier boundaries
- [ ] Suspended affiliates don't create new commissions
- [ ] Email notifications sent correctly
- [ ] Rate limiting works
- [ ] Error handling graceful (no order/payment failures)
- [ ] Admin analytics return correct totals
- [ ] All database indexes created
- [ ] No N+1 query problems in dashboard
- [ ] TypeScript compiles without errors
- [ ] Integration tests pass
- [ ] Load tests pass

---

**Testing Document**: February 20, 2026
**Status**: Ready for QA testing
