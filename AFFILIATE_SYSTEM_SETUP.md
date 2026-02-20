# Affiliate System Setup Guide

## Overview
The affiliate system is now integrated into the Ventech backend. This guide covers setup, configuration, and usage.

## Database Setup

### Step 1: Run Migrations
Execute the following SQL migrations in order:

1. **create_affiliates_table.sql** - Creates the affiliates table for managing affiliate accounts
2. **create_affiliate_referrals_table.sql** - Creates the affiliate_referrals table for tracking referral codes and referred customers
3. **create_affiliate_commissions_table.sql** - Creates the affiliate_commissions table for tracking earned commissions
4. **create_affiliate_payouts_table.sql** - Creates the affiliate_payouts table for tracking withdrawal requests
5. **create_affiliate_commission_tiers_table.sql** - Creates the affiliate_commission_tiers table for tiered commission rates

**Note**: The migration files are located in the `migrations/` directory.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Affiliate System Configuration
AFFILIATE_COMMISSION_MIN_PAYOUT=50            # Minimum commission amount (GHS) before auto-payout triggers
AFFILIATE_COMMISSION_AUTO_PAYOUT_ENABLED=true # Enable/disable automatic monthly payouts
AFFILIATE_COMMISSION_AUTO_PAYOUT_DAY=1        # Day of month to process auto-payouts (1-28)
AFFILIATE_COOKIE_NAME=ventech_affiliate_ref   # Cookie name for affiliate tracking
AFFILIATE_COOKIE_DURATION_DAYS=30             # How long to track a referral (days)
```

### Default Commission Tiers

The system comes with default tiered commission rates:

| Tier | Orders (90 days) | Commission Rate |
|------|------------------|-----------------|
| Bronze | 0-99 | 3% |
| Silver | 100-499 | 5% |
| Gold | 500+ | 7% |

These are inserted automatically when the migration runs. To modify tiers, update the `affiliate_commission_tiers` table directly.

## API Endpoints

### Public Endpoints

#### Submit Affiliate Application
```
POST /api/affiliate/
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+233 55 134 4310",
  "type": "individual",           // "individual" or "company"
  "companyName": "Tech Solutions", // Optional, required if type="company"
  "promotionChannel": "YouTube",
  "platformLink": "https://youtube.com/@johntechreviews",
  "country": "Ghana"
}
```

### Admin Endpoints

All admin endpoints require authentication with Bearer token and admin role.

#### List All Affiliates
```
GET /api/affiliate/admin/list?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (pending, active, suspended, rejected)

#### Approve Affiliate Application
```
POST /api/affiliate/admin/approve/:affiliateId
Authorization: Bearer <token>
```

Response includes the approved affiliate and their initial referral code.

#### Reject Affiliate Application
```
POST /api/affiliate/admin/reject/:affiliateId
Authorization: Bearer <token>
Content-Type: application/json

{
  "rejectionReason": "Does not meet minimum requirements for platform"
}
```

#### Suspend an Affiliate
```
POST /api/affiliate/admin/suspend/:affiliateId
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Suspected fraudulent activity"
}
```

#### Reactivate a Suspended Affiliate
```
POST /api/affiliate/admin/reactivate/:affiliateId
Authorization: Bearer <token>
```

### Affiliate Endpoints

All affiliate endpoints require authentication with Bearer token.

#### Get Affiliate Dashboard
```
GET /api/affiliate/dashboard/me
Authorization: Bearer <token>
```

Response includes:
- Affiliate profile information
- Total earned, pending, and paid commissions
- List of active referral codes
- 90-day performance metrics

#### Get Commission History
```
GET /api/affiliate/commissions/history?page=1&limit=20&status=earned
Authorization: Bearer <token>
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (pending, earned, paid)

## Referral Tracking

### Method 1: Referral Code (Per-Order)

Each approved affiliate gets a unique referral code (format: `AFFY-{affiliateId}-{random}`).

**Frontend Usage:**
```javascript
// When creating an order, pass the referral code
const referralCode = 'AFFY-12345678-ABC123';

// Include in order creation request
fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    // ... other order data
    referral_code: referralCode
  })
});

// Or as URL parameter (for cookie-based tracking)
// https://ventechgadgets.com?ref=AFFY-12345678-ABC123
```

**Cookie Setting (Client-Side):**
```javascript
// When user visits with referral code, set cookie
const urlParams = new URLSearchParams(window.location.search);
const ref = urlParams.get('ref');
if (ref) {
  document.cookie = `${COOKIE_NAME}=${ref}; max-age=${COOKIE_DURATION_DAYS * 24 * 60 * 60}`;
}
```

### Method 2: Customer Referral (Per-Customer)

When an affiliate directly refers a customer, create a customer referral:

```javascript
// Backend creates customer referral when account is linked
// This ties all future orders from that customer to the affiliate
```

## Commission Calculation

### Automatic Tier Escalation

Commissions are automatically calculated based on 90-day performance:

1. System counts successful orders (status = 'earned') in the last 90 days
2. Matches affiliate against tier thresholds
3. Applies the corresponding commission rate to new orders

**Example:**
- Affiliate has 120 successful orders → Silver tier (5% commission)
- New order for GHS 500 → Commission = GHS 25
- Commission status starts as 'pending'
- When payment confirmed → Status becomes 'earned'
- Affiliate can withdraw at any time if balance > minimum

### Commission Earning Flow

1. **Order Created**: Referral code/customer referral matched
   - Commission record created with status='pending'
   - Commission amount calculated based on current tier
   - Amount added to 'pending' earnings

2. **Payment Confirmed**: Order payment marked as 'paid'
   - Commission status updated to 'earned'
   - earned_at timestamp recorded
   - Affiliate can now request payout

3. **Payout Requested**: Affiliate submits withdrawal request
   - Verification of available earned balance
   - Payout request created (status='pending')
   - Admin reviews and processes

4. **Payout Processed**: Admin initiates payout
   - Transaction sent to Paystack
   - Status updates to 'processing' then 'paid'
   - Affiliate notified via email

## Payouts

### On-Demand Payouts

Affiliates can request payouts at any time if:
- They have earned commissions (status='earned')
- Total earned balance >= GHS 50 (configurable)
- Payout details are configured

**Endpoint**: `POST /api/affiliate/request-payout`
```javascript
{
  "amount": 250,           // GHS amount
  "payoutMethod": "paystack" // paystack, bank_transfer, mobile_money
}
```

### Automatic Monthly Payouts

If `AFFILIATE_COMMISSION_AUTO_PAYOUT_ENABLED=true`:
- Runs on the day specified by `AFFILIATE_COMMISSION_AUTO_PAYOUT_DAY`
- Automatically processes payouts for affiliates exceeding minimum balance
- Requires scheduled job/cron task

**Setup Cron Job** (using PM2 or similar):
```javascript
// In ecosystem.config.js
{
  name: "affiliate-payouts",
  script: "dist/cron/affiliate-payouts.js",
  cron_time: "0 0 1 * *", // 1st day of month at midnight
  autorestart: true,
  max_memory_restart: "500M"
}
```

## Email Notifications

The system sends the following automated emails:

### Affiliate Notifications
1. **Approval Email** - When application is approved
   - Includes referral code
   - Links to dashboard
   - Tier structure information

2. **Rejection Email** - When application is rejected
   - Includes rejection reason

3. **Commission Earned** - When payment confirmed (optional)
   - Shows commission amount
   - Order number and commission rate

4. **Payout Processed** - When withdrawal is completed
   - Shows amount and payment method
   - Transaction reference

### Email Customization

Email templates are in the `EnhancedEmailService` class. Modify:
- `sendAffiliateApprovalEmail()`
- `sendAffiliateRejectionEmail()`
- `sendCommissionEarnedEmail()`
- `sendPayoutProcessedEmail()`

## Integration Points

### OrderController Integration
When an order is created:
1. Check for `referral_code` or `referred_user_id` in request
2. Call `affiliateService.trackOrderFromReferral()`
3. Commission record created (status='pending')
4. Error logged but order creation continues (graceful degradation)

### PaymentController Integration
When payment is verified and confirmed:
1. Order payment_status updated to 'paid'
2. Call `affiliateService.confirmCommissionEarned()`
3. Commission status updated to 'earned' with timestamp
4. Error logged but payment confirmation continues

### Architecture
- **Standalone Module**: All affiliate logic in dedicated service
- **Read-Only**: OrderController only reads from orders/transactions
- **Non-Breaking**: Failures in affiliate processing don't affect core commerce
- **Async-Safe**: All affiliate operations non-blocking

## Troubleshooting

### Commissions Not Being Created
1. Verify affiliate status is 'active'
2. Check that referral_code is being passed to order creation
3. Review order controller logs for tracking errors

### Commissions Not Being Earned
1. Verify order payment_status is actually 'paid'
2. Check transaction controller logs for payment confirmation
3. Review affiliate_commissions table status values

### Tier Not Updating
1. Commission rate is calculated at order creation, not retroactively
2. New orders will automatically use the current tier
3. Historical commissions keep their original rate (designed this way)

### Admin Can't See Analytics
1. Verify user has 'admin' role
2. Check Bearer token is valid and not expired
3. Review auth middleware logs

## Security Notes

- API keys stored in environment variables only
- Affiliate data separated from user accounts initially
- Commission calculations performed server-side only
- Payroll operations protected by admin role
- Referral codes are unique and case-sensitive
- Rate limiting applied to all affiliate endpoints

## Future Enhancements

- [ ] Affiliate tier badges/displays
- [ ] Performance bonus structures
- [ ] Bulk payout processing
- [ ] Detailed analytics dashboard
- [ ] Custom commission structures per affiliate
- [ ] Affiliate marketing materials (banners, images)
- [ ] Referral leaderboard
- [ ] Commission withdrawal schedules
