-- Migration: Add key_features and specifications columns to products table
-- Run this in your Supabase SQL Editor or via migration tool

-- Add key_features column (stores JSON array)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS key_features TEXT;

-- Add specifications column (stores JSON object)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS specifications TEXT;

-- Add comments for documentation
COMMENT ON COLUMN products.key_features IS 'Key features as JSON array string (e.g., ["Fast processor", "Long battery life"])';
COMMENT ON COLUMN products.specifications IS 'Product specifications as JSON object string (e.g., {"processor": "Intel i7", "ram": "16GB"})';

