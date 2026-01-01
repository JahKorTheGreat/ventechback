-- Migration: Add brand column to products table for search functionality
-- This column stores the brand name as text for easier searching
-- It should be kept in sync with the brands table via triggers or application logic

-- Add brand column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Create index for faster brand searches
CREATE INDEX IF NOT EXISTS idx_products_brand_text ON products(brand);

-- Update existing products to populate brand column from brands table
-- This syncs the brand column with brand_id
UPDATE products p
SET brand = b.name
FROM brands b
WHERE p.brand_id = b.id
AND p.brand IS NULL;

-- Add comment
COMMENT ON COLUMN products.brand IS 'Brand name as text (for search). Should be kept in sync with brands table via brand_id.';

