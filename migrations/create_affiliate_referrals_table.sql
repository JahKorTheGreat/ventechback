-- Create affiliate_referrals table for tracking referral codes and referred customers
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  
  -- Method 1: Per-order referral code
  referral_code VARCHAR(50) UNIQUE,
  
  -- Method 2: Per-customer referral (customer referred by this affiliate)
  referred_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Type of referral: 'code' or 'customer_referral'
  referral_type VARCHAR(50) NOT NULL CHECK (referral_type IN ('code', 'customer_referral')),
  
  -- Tracking metrics
  click_count INT DEFAULT 0,
  conversion_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure that referral_code is provided for 'code' type, referred_user_id for 'customer_referral' type
ALTER TABLE public.affiliate_referrals
ADD CONSTRAINT check_referral_data 
CHECK (
  (referral_type = 'code' AND referral_code IS NOT NULL) OR
  (referral_type = 'customer_referral' AND referred_user_id IS NOT NULL)
);

-- Create indexes for common queries
CREATE INDEX idx_affiliate_referrals_affiliate_id ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_referral_code ON public.affiliate_referrals(referral_code);
CREATE INDEX idx_affiliate_referrals_referred_user_id ON public.affiliate_referrals(referred_user_id);
CREATE INDEX idx_affiliate_referrals_referral_type ON public.affiliate_referrals(referral_type);
CREATE INDEX idx_affiliate_referrals_created_at ON public.affiliate_referrals(created_at DESC);
