-- =====================================================
-- Add customer_bio column to orders table
-- =====================================================
-- This column stores customer identification information (name, email, phone)
-- for both guest and registered customers

-- Add customer_bio column as JSONB (allows flexible structure)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_bio JSONB DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN orders.customer_bio IS 'Customer identification information (name, email, phone) for both guest and registered customers';

