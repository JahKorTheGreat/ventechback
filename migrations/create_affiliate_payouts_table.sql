-- Create affiliate_payouts table for tracking payout requests and processing
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  
  -- Payout details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  
  -- How the payout should be made
  payout_method VARCHAR(50) NOT NULL CHECK (payout_method IN ('paystack', 'bank_transfer', 'mobile_money')),
  
  -- Status: pending, processing, paid, failed, rejected
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'rejected')),
  
  -- Payment gateway reference
  transaction_reference VARCHAR(255),
  paystack_transfer_code VARCHAR(255),
  
  -- Failure reason if applicable
  failure_reason TEXT,
  
  -- Dates
  request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_date TIMESTAMP,
  paid_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_affiliate_payouts_affiliate_id ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_payouts_status ON public.affiliate_payouts(status);
CREATE INDEX idx_affiliate_payouts_request_date ON public.affiliate_payouts(request_date DESC);
CREATE INDEX idx_affiliate_payouts_created_at ON public.affiliate_payouts(created_at DESC);
CREATE INDEX idx_affiliate_payouts_affiliate_status ON public.affiliate_payouts(affiliate_id, status);
