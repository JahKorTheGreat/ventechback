-- =====================================================
-- Create Transactions Table for Payment Tracking
-- =====================================================
-- This table tracks all payment transactions separately from orders
-- for better analytics, sales tracking, and financial reporting

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Payment Details
  transaction_reference VARCHAR(255) UNIQUE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('paystack', 'cash_on_delivery', 'mobile_money', 'card')),
  payment_provider VARCHAR(50) DEFAULT 'paystack', -- e.g., 'paystack', 'mobile_money', etc.
  
  -- Financial Details
  amount DECIMAL(10, 2) NOT NULL, -- Amount in pesewas (GHS * 100) or actual amount
  currency VARCHAR(3) DEFAULT 'GHS',
  
  -- Transaction Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Paystack/Provider Details
  paystack_reference VARCHAR(255), -- Paystack transaction reference
  authorization_code VARCHAR(255), -- Paystack authorization code
  channel VARCHAR(50), -- Payment channel (card, bank, ussd, qr, etc.)
  customer_email VARCHAR(255) NOT NULL, -- Customer email for the transaction
  customer_code VARCHAR(255), -- Paystack customer code
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional payment data
  
  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_paystack_ref ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_paid_at ON transactions(paid_at);

-- Add comment for documentation
COMMENT ON TABLE transactions IS 'Tracks all payment transactions for orders - used for analytics, sales tracking, and financial reporting';
COMMENT ON COLUMN transactions.amount IS 'Amount in pesewas (GHS * 100) for Paystack, or actual amount for other methods';
COMMENT ON COLUMN transactions.metadata IS 'Additional payment data including checkout_data, user details, etc.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Transactions table created successfully!';
  RAISE NOTICE '   - Tracks all payment transactions';
  RAISE NOTICE '   - Links to orders and users';
  RAISE NOTICE '   - Includes Paystack references and customer details';
  RAISE NOTICE '   - Ready for analytics and reporting';
END $$;

