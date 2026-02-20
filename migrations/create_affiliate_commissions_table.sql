-- Create affiliate_commissions table for tracking earned commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  
  -- Links to existing order and transaction (read-only references)
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  
  -- Commission calculation
  order_total DECIMAL(15, 2) NOT NULL,
  commission_rate INT NOT NULL CHECK (commission_rate IN (3, 5, 7)),
  commission_amount DECIMAL(15, 2) NOT NULL,
  
  -- How this commission was earned
  referral_type VARCHAR(50) NOT NULL CHECK (referral_type IN ('code', 'customer_referral')),
  referral_code VARCHAR(50),
  referred_user_id UUID,
  
  -- Commission status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'paid', 'disputed', 'cancelled')),
  
  -- Timestamps
  order_date TIMESTAMP NOT NULL,
  earned_at TIMESTAMP,
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_order_id ON public.affiliate_commissions(order_id);
CREATE INDEX idx_affiliate_commissions_transaction_id ON public.affiliate_commissions(transaction_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX idx_affiliate_commissions_earned_at ON public.affiliate_commissions(earned_at DESC);
CREATE INDEX idx_affiliate_commissions_created_at ON public.affiliate_commissions(created_at DESC);
CREATE INDEX idx_affiliate_commissions_affiliate_status ON public.affiliate_commissions(affiliate_id, status);
CREATE INDEX idx_affiliate_commissions_referral_type ON public.affiliate_commissions(referral_type);
