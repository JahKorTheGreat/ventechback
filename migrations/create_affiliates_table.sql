-- Create affiliates table for affiliate system
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Basic Information
  full_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  
  -- Type: individual or company
  type VARCHAR(50) NOT NULL CHECK (type IN ('individual', 'company')),
  
  -- Status: pending, active, suspended, rejected
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  
  -- Commission tier (percentage)
  commission_tier INT DEFAULT 3 CHECK (commission_tier IN (3, 5, 7)),
  
  -- Performance metrics stored as JSONB
  performance_metrics JSONB DEFAULT '{
    "total_referrals": 0,
    "successful_referrals": 0,
    "click_count": 0,
    "conversion_count": 0,
    "total_commission_earned": 0
  }'::jsonb,
  
  -- Bank details for payouts (stored securely as JSONB)
  payout_details JSONB,
  
  -- Additional info
  promotion_channel VARCHAR(255),
  platform_link VARCHAR(500),
  country VARCHAR(100),
  bio TEXT,
  terms_accepted BOOLEAN DEFAULT false,
  
  -- Admin tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_affiliates_email ON public.affiliates(email);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliates_created_at ON public.affiliates(created_at DESC);
CREATE INDEX idx_affiliates_commission_tier ON public.affiliates(commission_tier);
