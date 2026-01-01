-- Migration: Create trigger to keep brand column in sync with brands table
-- This ensures the brand text column stays updated when brand_id changes

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

-- Update existing products to sync brand column
UPDATE products p
SET brand = b.name
FROM brands b
WHERE p.brand_id = b.id
AND (p.brand IS NULL OR p.brand != b.name);

