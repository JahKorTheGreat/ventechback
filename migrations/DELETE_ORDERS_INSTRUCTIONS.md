# Delete All Orders - Clean Start Instructions

## ⚠️ WARNING
This operation is **IRREVERSIBLE**. All orders, order items, and transactions will be permanently deleted from the database.

## What Will Be Deleted
- ✅ All order items (products in orders)
- ✅ All transactions (payment records)
- ✅ All orders

## What Will NOT Be Deleted
- ✅ Users (customer accounts remain)
- ✅ Products (product catalog remains)
- ✅ Categories (product categories remain)
- ✅ Coupons (coupon codes remain)
- ✅ Other system data

## How to Execute

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `delete_all_orders_cleanup.sql`
5. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
6. Confirm the deletion when prompted

### Option 2: Using psql Command Line
```bash
psql -h your-db-host -U postgres -d postgres -f backend/migrations/delete_all_orders_cleanup.sql
```

### Option 3: Using Supabase CLI
```bash
supabase db execute -f backend/migrations/delete_all_orders_cleanup.sql
```

## Verification
After running the script, you can verify the deletion by running:
```sql
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_order_items FROM order_items;
SELECT COUNT(*) as remaining_transactions FROM transactions;
```

All counts should be `0`.

## After Cleanup
- New orders will start from `ORD-001` (based on the current date)
- Order numbering will reset for the current date
- All previous order history will be gone

## Backup Recommendation
Before running this script, consider:
1. Exporting order data if you need historical records
2. Taking a database backup
3. Exporting transaction data for accounting purposes

## Need Help?
If you encounter any issues:
1. Check that you have the necessary database permissions
2. Ensure no other processes are actively using the orders table
3. Verify foreign key constraints allow deletion

