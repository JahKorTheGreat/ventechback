-- =====================================================
-- Create Affiliate System Tables
-- =====================================================
-- Comprehensive affiliate marketing system for VENTECH

-- 1. Affiliates Table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('starter', 'pro', 'elite')) DEFAULT 'starter',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (total_earnings >= 0),
  pending_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (pending_earnings >= 0),
  total_clicks INTEGER NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
  total_conversions INTEGER NOT NULL DEFAULT 0 CHECK (total_conversions >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Referral Links Table
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  short_url VARCHAR(255),
  source VARCHAR(100),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  conversions INTEGER NOT NULL DEFAULT 0 CHECK (conversions >= 0),
  earnings DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (earnings >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Earnings Table
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  method VARCHAR(50) CHECK (method IN ('bank', 'momo', 'crypto')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed')) DEFAULT 'pending',
  reference VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bank', 'momo', 'crypto')),
  name VARCHAR(255) NOT NULL,
  details TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Click Logs Table (for tracking affiliate clicks)
CREATE TABLE IF NOT EXISTS click_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code VARCHAR(20) NOT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  source VARCHAR(100),
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

CREATE INDEX IF NOT EXISTS idx_referral_links_affiliate_id ON referral_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_source ON referral_links(source);

CREATE INDEX IF NOT EXISTS idx_earnings_affiliate_id ON earnings(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_earnings_order_id ON earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate_id ON payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_methods_affiliate_id ON payment_methods(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_click_logs_referral_code ON click_logs(referral_code);
CREATE INDEX IF NOT EXISTS idx_click_logs_converted ON click_logs(converted);
CREATE INDEX IF NOT EXISTS idx_click_logs_created_at ON click_logs(created_at);

-- =====================================================
-- Triggers for Auto-Update Timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_affiliates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_affiliates_updated_at
BEFORE UPDATE ON affiliates
FOR EACH ROW
EXECUTE FUNCTION update_affiliates_updated_at();

-- Repeat for other tables
CREATE OR REPLACE FUNCTION update_referral_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_referral_links_updated_at
BEFORE UPDATE ON referral_links
FOR EACH ROW
EXECUTE FUNCTION update_referral_links_updated_at();

CREATE OR REPLACE FUNCTION update_earnings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_earnings_updated_at
BEFORE UPDATE ON earnings
FOR EACH ROW
EXECUTE FUNCTION update_earnings_updated_at();

CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payouts_updated_at
BEFORE UPDATE ON payouts
FOR EACH ROW
EXECUTE FUNCTION update_payouts_updated_at();

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_payment_methods_updated_at();

CREATE OR REPLACE FUNCTION update_click_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_click_logs_updated_at
BEFORE UPDATE ON click_logs
FOR EACH ROW
EXECUTE FUNCTION update_click_logs_updated_at();

-- =====================================================
-- Helper Functions for RPC Calls
-- =====================================================

-- Increment total clicks
CREATE OR REPLACE FUNCTION increment_total_clicks(affiliate_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliates SET total_clicks = total_clicks + 1 WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Increment total conversions
CREATE OR REPLACE FUNCTION increment_total_conversions(affiliate_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliates SET total_conversions = total_conversions + 1 WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Increment pending earnings
CREATE OR REPLACE FUNCTION increment_pending_earnings(affiliate_id UUID, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE affiliates SET pending_earnings = pending_earnings + amount WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql;