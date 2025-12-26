-- Drop coupons table and related objects
-- Run this in your Supabase SQL Editor

-- Drop the coupons table (this will also drop any foreign key constraints)
DROP TABLE IF EXISTS coupons CASCADE;

-- If you have any RPC functions related to coupons, drop them too:
DROP FUNCTION IF EXISTS validate_coupon CASCADE;
DROP FUNCTION IF EXISTS calculate_discount CASCADE;
DROP FUNCTION IF EXISTS generate_coupon_code CASCADE;

-- Note: This will permanently delete all coupon data
-- Make sure you have a backup if you need the data later

