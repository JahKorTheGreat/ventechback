-- Fix in_stock flag for all existing products
-- This script updates in_stock to match stock_quantity
-- in_stock = true if stock_quantity > 0, false otherwise

UPDATE products
SET 
  in_stock = CASE 
    WHEN stock_quantity > 0 THEN true 
    ELSE false 
  END,
  updated_at = NOW()
WHERE 
  -- Only update products where in_stock doesn't match stock_quantity
  (stock_quantity > 0 AND in_stock = false)
  OR 
  (stock_quantity = 0 AND in_stock = true);

-- Verify the fix
SELECT 
  id,
  name,
  stock_quantity,
  in_stock,
  CASE 
    WHEN stock_quantity > 0 AND in_stock = true THEN '✅ Correct'
    WHEN stock_quantity = 0 AND in_stock = false THEN '✅ Correct'
    ELSE '❌ Mismatch'
  END as status
FROM products
ORDER BY name;

