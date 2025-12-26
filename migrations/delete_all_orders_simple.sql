-- =====================================================
-- DELETE ALL ORDERS - CLEAN START (Simple Version)
-- =====================================================
-- WARNING: This script will PERMANENTLY DELETE all orders and related data
-- This is IRREVERSIBLE. Make sure you have backups if needed.
-- =====================================================

-- Step 1: Delete all order items (they reference orders via foreign key)
DELETE FROM order_items;

-- Step 2: Delete all transactions (they reference orders)
DELETE FROM transactions;

-- Step 3: Delete all orders
DELETE FROM orders;

-- Verification queries (run these separately to confirm deletion)
-- SELECT COUNT(*) as remaining_orders FROM orders;
-- SELECT COUNT(*) as remaining_order_items FROM order_items;
-- SELECT COUNT(*) as remaining_transactions FROM transactions;

