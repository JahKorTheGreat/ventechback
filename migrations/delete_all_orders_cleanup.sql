-- =====================================================
-- DELETE ALL ORDERS - CLEAN START
-- =====================================================
-- WARNING: This script will PERMANENTLY DELETE all orders and related data
-- This is IRREVERSIBLE. Make sure you have backups if needed.
--
-- This script deletes:
-- 1. All order_items (items in orders)
-- 2. All transactions (payment records)
-- 3. All orders
--
-- Run this script in Supabase SQL Editor or via psql
-- =====================================================

BEGIN;

-- Step 1: Delete all order items (they reference orders via foreign key)
DELETE FROM order_items;

-- Step 2: Delete all transactions (they reference orders, but with ON DELETE SET NULL)
-- We delete them explicitly for a clean start
DELETE FROM transactions;

-- Step 3: Delete all orders
DELETE FROM orders;

-- Verify deletion (optional - uncomment to check)
-- SELECT COUNT(*) as remaining_orders FROM orders;
-- SELECT COUNT(*) as remaining_order_items FROM order_items;
-- SELECT COUNT(*) as remaining_transactions FROM transactions;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All orders, order items, and transactions have been deleted successfully!';
  RAISE NOTICE '   - Database is now clean and ready for a fresh start';
  RAISE NOTICE '   - New orders will start from ORD-001';
END $$;

