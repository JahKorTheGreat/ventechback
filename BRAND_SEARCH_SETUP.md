# 🔍 Brand Search Setup Guide

## Issue
The `products` table may be missing the `brand` column, which is needed for brand search functionality.

## Solution
Run the migration to add the `brand` column and keep it synced with the `brands` table.

## Steps

### 1. Run Migration in Supabase

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Add brand column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Create index for faster brand searches
CREATE INDEX IF NOT EXISTS idx_products_brand_text ON products(brand);

-- Update existing products to populate brand column from brands table
UPDATE products p
SET brand = b.name
FROM brands b
WHERE p.brand_id = b.id
AND p.brand IS NULL;
```

### 2. (Optional) Add Trigger to Auto-Sync

To keep the `brand` column automatically synced with the `brands` table:

```sql
-- Function to sync brand column from brands table
CREATE OR REPLACE FUNCTION sync_product_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- Update brand column from brands table when brand_id changes
  IF NEW.brand_id IS NOT NULL THEN
    SELECT name INTO NEW.brand
    FROM brands
    WHERE id = NEW.brand_id;
  ELSE
    NEW.brand = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync brand column
DROP TRIGGER IF EXISTS trigger_sync_product_brand ON products;
CREATE TRIGGER trigger_sync_product_brand
  BEFORE INSERT OR UPDATE OF brand_id ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_brand();
```

### 3. Verify

After running the migration:

1. Check that the `brand` column exists:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'products' AND column_name = 'brand';
   ```

2. Check that products have brand values:
   ```sql
   SELECT id, name, brand_id, brand 
   FROM products 
   LIMIT 10;
   ```

3. Test brand search:
   ```bash
   curl "http://localhost:5000/api/products?search=laptop"
   ```

## How It Works

- **Brand Column**: Stores brand name as text for easy searching
- **Brand ID**: References the `brands` table (for relationships)
- **Auto-Sync**: Trigger keeps `brand` column updated when `brand_id` changes
- **Search**: Can now search in `name`, `description`, and `brand` columns

## Alternative: Search Without Brand Column

If you don't want to add the `brand` column, you can search brands separately:

1. Search brands table for matching names
2. Get brand IDs
3. Filter products by those brand IDs

But this is more complex and slower. The `brand` column approach is recommended.

## Files Created

- `backend/migrations/add_brand_column_to_products.sql` - Adds brand column
- `backend/migrations/sync_brand_column_trigger.sql` - Auto-sync trigger

## After Migration

1. Rebuild backend: `npm run build`
2. Restart server: `npm run dev`
3. Test brand search: `curl "http://localhost:5000/api/products?search=lenovo"`

