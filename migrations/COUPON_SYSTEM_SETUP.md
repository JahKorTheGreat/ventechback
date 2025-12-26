# Coupon System Setup Guide

## Database Setup

Run these SQL migrations in order in your Supabase SQL Editor:

1. **Create coupons table:**
   ```sql
   -- Run: create_coupons_table.sql
   ```

2. **Create coupon usage tracking table:**
   ```sql
   -- Run: create_coupon_usage_table.sql
   ```

3. **Create validate_coupon function:**
   ```sql
   -- Run: create_validate_coupon_function.sql
   ```

4. **Create record_coupon_usage function:**
   ```sql
   -- Run: create_record_coupon_usage_function.sql
   ```

## Backend Setup

The backend API is already configured. The coupon routes are available at:
- `POST /api/coupons/validate` - Validate a coupon code
- `POST /api/coupons/record-usage` - Record coupon usage
- `GET /api/coupons` - Get all coupons (admin)
- `GET /api/coupons/:id` - Get coupon by ID (admin)
- `POST /api/coupons` - Create coupon (admin)
- `PATCH /api/coupons/:id` - Update coupon (admin)
- `DELETE /api/coupons/:id` - Delete coupon (admin)

## Frontend Integration

The coupon service is ready to use. To integrate with the cart:

1. Import the coupon service:
   ```typescript
   import { couponService } from '@/services/coupon.service';
   ```

2. Validate coupon:
   ```typescript
   const validation = await couponService.validateCoupon(code, cartTotal, userId);
   if (validation.is_valid) {
     // Apply discount
   }
   ```

3. Record usage after order creation:
   ```typescript
   await couponService.recordCouponUsage(couponId, userId, orderId, discountAmount, orderTotal);
   ```

## Features

- ✅ Percentage discounts
- ✅ Fixed amount discounts
- ✅ Free shipping discounts
- ✅ Minimum order amount requirements
- ✅ Maximum discount limits (for percentage)
- ✅ Usage limits (total and per-user)
- ✅ Validity dates
- ✅ Automatic usage tracking
- ✅ Backend API validation
- ✅ Database function for validation

## Next Steps

1. Run the database migrations
2. Test coupon validation via API
3. Add coupon input component to cart page
4. Create admin coupon management page

