-- Create affiliate_commission_tiers table for defining tier thresholds
CREATE TABLE IF NOT EXISTS public.affiliate_commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Threshold for this tier (number of orders in the last 90 days)
  min_orders INT NOT NULL CHECK (min_orders >= 0),
  max_orders INT CHECK (max_orders IS NULL OR max_orders > min_orders),
  
  -- Commission percentage for this tier
  commission_percentage INT NOT NULL CHECK (commission_percentage > 0 AND commission_percentage <= 100),
  
  -- Tier label for display purposes
  tier_label VARCHAR(100) NOT NULL,
  tier_description TEXT,
  
  -- Is this tier active
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO public.affiliate_commission_tiers (min_orders, max_orders, commission_percentage, tier_label, tier_description)
VALUES
  (0, 99, 3, 'Bronze', 'Get started with 3% commission'),
  (100, 499, 5, 'Silver', 'Reach 100 orders for 5% commission'),
  (500, NULL, 7, 'Gold', 'Achieve 500+ orders for 7% commission')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX idx_affiliate_commission_tiers_min_orders ON public.affiliate_commission_tiers(min_orders);
CREATE INDEX idx_affiliate_commission_tiers_is_active ON public.affiliate_commission_tiers(is_active);
