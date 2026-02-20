# Affiliate System - Implementation Summary

## ✅ What Has Been Implemented

### 1. Database Schema (5 New Tables)
All migrations are ready in `/migrations/`:
- **affiliates** - Core affiliate accounts with profiles, status, and performance metrics
- **affiliate_referrals** - Referral codes (per-order) and customer referrals (per-customer)
- **affiliate_commissions** - Commission records linked to orders; tracks earning status
- **affiliate_payouts** - Withdrawal requests and payout processing history
- **affiliate_commission_tiers** - Tiered commission rate structure (Bronze 3%, Silver 5%, Gold 7%)

### 2. Services
**AffiliateService** (`src/services/affiliate.service.ts`) - Singleton with all business logic:
- Affiliate application creation
- Approval/rejection/suspension workflows
- Referral code generation & validation
- Commission calculation (automatic tier escalation)
- Commission earning (when payment confirmed)
- Dashboard data aggregation
- Payout request & history management
- System-wide analytics

### 3. Extended Controllers
**AffiliateController** (`src/controllers/affiliate.controller.ts`):
- Enhanced `submitAffiliateApplication()` - Creates DB record + sends email
- `approveAffiliate()` - Activates affiliate + generates referral code
- `rejectAffiliate()` - Rejects application + sends email
- `suspendAffiliate()` / `reactivateAffiliate()` - Status management
- `getAffiliateDashboard()` - Affiliate dashboard with earnings/metrics
- `getCommissionHistory()` - Paginated commission list
- `listAffiliates()` - Admin view with filters
- `getAnalytics()` - System-wide affiliate metrics

**OrderController** (`src/controllers/order.controller.ts`):
- Added affiliate tracking hook in `createOrder()`
- Checks for `referral_code` or `referred_user_id`
- Creates commission record (status='pending')
- Non-blocking; failures logged but don't affect order

**PaymentController** (`src/controllers/payment.controller.ts`):
- Added affiliate commission confirmation in `verifyTransaction()`
- When payment confirmed, marks commissions as earned
- Sets earned_at timestamp
- Non-blocking; failures logged

### 4. Routes
**Affiliate Routes** (`src/routes/affiliate.routes.ts`):
```
PUBLIC:
  POST /api/affiliate/                    - Submit application

AUTHENTICATED:
  GET /api/affiliate/dashboard/me         - Affiliate dashboard
  GET /api/affiliate/commissions/history  - Commission history

ADMIN:
  GET /api/affiliate/admin/list           - List all affiliates
  GET /api/affiliate/admin/analytics      - System analytics
  POST /api/affiliate/admin/approve/:id   - Approve application
  POST /api/affiliate/admin/reject/:id    - Reject application
  POST /api/affiliate/admin/suspend/:id   - Suspend affiliate
  POST /api/affiliate/admin/reactivate/:id - Reactivate
```

### 5. Email Service Enhancements
**EnhancedEmailService** (`src/services/enhanced-email.service.ts`):
- `sendAffiliateApprovalEmail()` - Welcome + referral code
- `sendAffiliateRejectionEmail()` - Status update
- `sendCommissionEarnedEmail()` - Commission notification
- `sendPayoutProcessedEmail()` - Withdrawal confirmation

### 6. Middleware
**Rate Limiting** (`src/middleware/rateLimit.middleware.ts`):
- Added `affiliateRateLimiter` - 30 req/min per affiliate
- Applied to all affiliate endpoints

### 7. Documentation
- **AFFILIATE_SYSTEM_SETUP.md** - Complete setup guide with API docs, configuration, troubleshooting

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AFFILIATE SYSTEM                          │
└─────────────────────────────────────────────────────────────┘

STANDALONE FLOW:
┌──────────────────┐
│ Affiliate App    │ (public POST)
│ Submission       │ → Database record (status=pending)
└──────────────────┘

┌──────────────────┐
│ Admin Reviews    │ (authenticate + isAdmin)
│ & Approves       │ → Status→active, create referral code
└──────────────────┘

READ-ONLY INTEGRATIONS:
┌────────────────────────┐      ┌──────────────────────┐
│ OrderController        │─────→│ AffiliateService    │
│ createOrder()          │      │ trackOrder(...)     │
│ - Check referral code  │      │ - Read orders only   │
│ - Call trackOrder()    │      │ - Create commission │
│ - Non-blocking         │      │   (status=pending)  │
└────────────────────────┘      └──────────────────────┘

┌────────────────────────┐      ┌──────────────────────┐
│ PaymentController      │─────→│ AffiliateService    │
│ verifyTransaction()    │      │ confirmEarned(...)  │
│ - Call confirmEarned() │      │ - Read trans only    │
│ - Non-blocking         │      │ - Mark earned with  │
│                        │      │   timestamp        │
└────────────────────────┘      └──────────────────────┘

AFFILIATE DASHBOARD:
┌──────────────────────────┐
│ GET /dashboard/me        │ (authenticate)
│ - User's affiliate data  │
│ - Earnings breakdown     │
│ - Referral codes        │
│ - Performance metrics   │
└──────────────────────────┘
```

---

## 🔄 Commission Flow

### 1. Order Creation
```
Customer places order with referral code:
{
  "order_items": [...],
  "referral_code": "AFFY-12345678-ABC123",  ← Key parameter
  "total": 500
}

↓

OrderController.createOrder() →
  affiliateService.trackOrderFromReferral(orderId, code)
    ├─ Find affiliate via referral code
    ├─ Get affiliate's current commission tier (last 90 days)
    ├─ Calculate: commission = total * tier_percentage / 100
    └─ Create: affiliate_commissions record
       {
         affiliate_id, order_id, commission_amount,
         commission_rate: 3|5|7,
         referral_type: 'code',
         status: 'pending',  ← Awaiting payment
         order_date: now()
       }
```

### 2. Payment Confirmation
```
Customer pays for order:
  
PaymentController.verifyTransaction() →
  Order payment_status = 'paid'
  
  affiliateService.confirmCommissionEarned(orderId, transactionId)
    ├─ Find all affiliate_commissions for this order
    │  WHERE status = 'pending'
    └─ Update:
       {
         status: 'earned',  ← Now eligible for payout
         earned_at: now(),
         transaction_id: <id>
       }
```

### 3. Payout Processing
```
Affiliate requests payout (or auto-payout triggers):

Check available balance:
  SUM(commission_amount) WHERE 
    status = 'earned' AND 
    earned_at < (now - 30 days) AND
    amount > MINIMUM_PAYOUT (GHS 50)

↓

Create affiliate_payouts record:
  {
    affiliate_id, amount, payout_method,
    status: 'pending'  ← Awaiting admin approval
  }

↓

Admin processes payout:
  → Send to Paystack / bank
  → Update: status = 'processing'
  → When confirmed: status = 'paid'
  → Send email notification
```

---

## ✨ Key Features

### Dual Referral Methods
1. **Per-Order (Referral Code)**
   - Code: `AFFY-{affiliate_id}-{random}`
   - Affiliate generates multiple codes
   - Each code can track multiple orders
   - Cookie-based or URL parameter

2. **Per-Customer**
   - Link customer to affiliate
   - Customer's ALL orders earn commissions
   - One-time setup

### Automatic Tier Escalation
- Calculated at order creation time (not retroactive)
- Based on 90-day successful order count
- Tiers: Bronze (3%), Silver (5%), Gold (7%)
- Different affiliates can have different tiers simultaneously
- Commission rates set at order time, don't change historically

### Commission Status Workflow
```
pending  →  earned  →  paid
        (payment)  (payout)
        
- pending: Order placed, awaiting payment
- earned: Payment confirmed, eligible for payout
- paid: Payout sent to affiliate
```

### Multiple Payout Methods
- Paystack (online)
- Bank Transfer
- Mobile Money (MTN, Vodafone, Tigo)

### Non-Breaking Integration
- Affiliate failures don't affect order creation
- Affiliate failures don't affect payment processing
- All errors logged for monitoring
- Graceful degradation by design

---

## 🔐 Security Features

1. **Authentication Required**
   - Affiliate dashboard: Bearer token
   - Admin operations: Bearer token + admin role
   - Public submission: Rate limited (publicRateLimiter)

2. **Rate Limiting**
   - Public endpoints: 100 req/min
   - Affiliate endpoints: 30 req/min
   - Admin endpoints: 100 req/min per admin

3. **Data Isolation**
   - Affiliate tables separate from user tables
   - Read-only access to orders/transactions
   - Commission calculations server-side only

4. **Unique Constraints**
   - Referral codes: UNIQUE
   - Affiliate emails: UNIQUE
   - No duplicate affiliate records per user

---

## 📋 Verification Checklist

### Database
- [ ] All 5 migrations executed successfully
- [ ] affiliates table has correct schema with indexes
- [ ] Default tiers inserted (Bronze, Silver, Gold)
- [ ] Foreign key constraints working

### API Endpoints
- [ ] POST /api/affiliate/ creates affiliate_applications record
- [ ] GET /api/affiliate/admin/list returns paginated list
- [ ] POST /api/affiliate/admin/approve/:id approves + creates referral code
- [ ] POST /api/affiliate/admin/reject/:id rejects + sends email
- [ ] GET /api/affiliate/dashboard/me returns affiliate dashboard data
- [ ] GET /api/affiliate/commissions/history returns commission list

### Integration Points
- [ ] Order creation with referral_code creates affiliate_commissions record
- [ ] Payment confirmation marks commission as 'earned'
- [ ] Commission status correctly updates
- [ ] Tier calculation works (matches 90-day order count)

### Email Notifications
- [ ] Approval email sent with referral code
- [ ] Rejection email sent with reason
- [ ] Commission earned emails sent (optional)
- [ ] Payout confirmation emails sent

### Error Handling
- [ ] Affiliate errors don't block order creation
- [ ] Affiliate errors don't block payment processing
- [ ] All errors logged to console
- [ ] Graceful degradation working

---

## 📝 Next Steps to Deploy

### Step 1: Database Migration
```sql
-- Execute in Supabase SQL Editor (in order):
1. migrations/create_affiliates_table.sql
2. migrations/create_affiliate_referrals_table.sql
3. migrations/create_affiliate_commissions_table.sql
4. migrations/create_affiliate_payouts_table.sql
5. migrations/create_affiliate_commission_tiers_table.sql
```

### Step 2: Environment Variables
```bash
# Add to .env file:
AFFILIATE_COMMISSION_MIN_PAYOUT=50
AFFILIATE_COMMISSION_AUTO_PAYOUT_ENABLED=true
AFFILIATE_COMMISSION_AUTO_PAYOUT_DAY=1
AFFILIATE_COOKIE_NAME=ventech_affiliate_ref
AFFILIATE_COOKIE_DURATION_DAYS=30
```

### Step 3: Frontend Integration
- Add referral code input to checkout
- Add cookie tracking for referral links
- Add affiliate dashboard page (GET /api/affiliate/dashboard/me)
- Add commission history page

### Step 4: Testing
- Test affiliate application submission
- Test affiliate approval/rejection
- Test order creation with referral code
- Test payment confirmation and commission earning
- Test dashboard data aggregation
- Test payout requests

### Step 5: Admin Interface
- Create admin page to view pending applications
- Create affiliate management section
- Create analytics dashboard
- Create payout processor

---

## 🐛 Debugging Tips

### Check Affiliate Commission Creation
```sql
SELECT * FROM affiliate_commissions 
WHERE order_id = '<order_id>'
ORDER BY created_at DESC;
```

### Check Affiliate Status
```sql
SELECT id, full_name, email, status, commission_tier 
FROM affiliates 
WHERE status = 'pending';
```

### Check Commission Tier Calculation
```sql
-- Count successful orders for an affiliate (last 90 days)
SELECT COUNT(*) as order_count 
FROM affiliate_commissions 
WHERE affiliate_id = '<affiliate_id>' 
  AND status = 'earned' 
  AND earned_at >= NOW() - INTERVAL '90 days';
```

### Check Payout Details
```sql
SELECT a.full_name, ap.amount, ap.status, ap.payout_method 
FROM affiliate_payouts ap 
JOIN affiliates a ON ap.affiliate_id = a.id 
ORDER BY ap.created_at DESC;
```

---

## 📚 Documentation Files

- **AFFILIATE_SYSTEM_SETUP.md** - Setup guide, API docs, configuration
- **This file** (AFFILIATE_IMPLEMENTATION_SUMMARY.md) - Architecture, flows, checklist

---

**Implementation completed**: February 20, 2026
**Status**: Ready for database migration and testing
**Architecture**: Standalone module, read-only integration, non-breaking
