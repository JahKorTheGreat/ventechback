-- =====================================================
-- Create Coupons Table
-- =====================================================
-- This table stores discount coupons that can be applied to orders

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Coupon Details
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount Configuration
  discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value >= 0),
  
  -- Conditions
  minimum_amount DECIMAL(10, 2) DEFAULT 0 CHECK (minimum_amount >= 0),
  maximum_discount DECIMAL(10, 2) CHECK (maximum_discount >= 0), -- Only for percentage discounts
  applies_to VARCHAR(50) DEFAULT 'all' CHECK (applies_to IN ('all', 'products', 'shipping', 'total')),
  
  -- Usage Limits
  usage_limit INTEGER CHECK (usage_limit > 0), -- NULL means unlimited
  used_count INTEGER DEFAULT 0 CHECK (used_count >= 0),
  per_user_limit INTEGER DEFAULT 1 CHECK (per_user_limit > 0), -- How many times a single user can use it
  
  -- Validity
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_coupons_validity ON coupons(valid_from, valid_until) WHERE is_active = true;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_updated_at();

-- RLS Policies (if using Row Level Security)
-- Allow public read access to active coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until >= NOW()));

-- Allow authenticated users to view all coupons (for admin)
CREATE POLICY "Authenticated users can view all coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to do everything (for backend API)
CREATE POLICY "Service role has full access"
  ON coupons FOR ALL
  TO service_role
  USING (true);

-- Comments for documentation
COMMENT ON TABLE coupons IS 'Stores discount coupons that can be applied to orders';
COMMENT ON COLUMN coupons.discount_type IS 'Type of discount: percentage, fixed_amount, or free_shipping';
COMMENT ON COLUMN coupons.discount_value IS 'Discount amount (percentage or fixed amount in GHS)';
COMMENT ON COLUMN coupons.maximum_discount IS 'Maximum discount amount for percentage discounts (in GHS)';
COMMENT ON COLUMN coupons.applies_to IS 'What the discount applies to: all, products, shipping, or total';
COMMENT ON COLUMN coupons.usage_limit IS 'Total number of times this coupon can be used (NULL = unlimited)';
COMMENT ON COLUMN coupons.per_user_limit IS 'Number of times a single user can use this coupon';

