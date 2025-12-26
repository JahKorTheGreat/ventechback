-- =====================================================
-- Create validate_coupon RPC Function
-- =====================================================
-- This function validates a coupon code and returns discount information

CREATE OR REPLACE FUNCTION validate_coupon(
  coupon_code TEXT,
  cart_amount DECIMAL,
  user_id_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  coupon_record RECORD;
  discount_amount DECIMAL(10, 2) := 0;
  usage_count INTEGER := 0;
  user_usage_count INTEGER := 0;
  is_valid BOOLEAN := false;
  error_message TEXT := '';
BEGIN
  -- Find the coupon
  SELECT * INTO coupon_record
  FROM coupons
  WHERE UPPER(code) = UPPER(coupon_code)
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());

  -- Check if coupon exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'error_message', 'Invalid coupon code'
    );
  END IF;

  -- Check minimum amount
  IF cart_amount < coupon_record.minimum_amount THEN
    RETURN json_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'error_message', format('Minimum order amount of GHS %s required', coupon_record.minimum_amount)
    );
  END IF;

  -- Check total usage limit
  IF coupon_record.usage_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO usage_count
    FROM coupon_usage
    WHERE coupon_id = coupon_record.id;

    IF usage_count >= coupon_record.usage_limit THEN
      RETURN json_build_object(
        'is_valid', false,
        'discount_amount', 0,
        'error_message', 'This coupon has reached its usage limit'
      );
    END IF;
  END IF;

  -- Check per-user usage limit
  IF user_id_param IS NOT NULL AND coupon_record.per_user_limit > 0 THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM coupon_usage
    WHERE coupon_id = coupon_record.id
      AND user_id = user_id_param;

    IF user_usage_count >= coupon_record.per_user_limit THEN
      RETURN json_build_object(
        'is_valid', false,
        'discount_amount', 0,
        'error_message', 'You have already used this coupon the maximum number of times'
      );
    END IF;
  END IF;

  -- Calculate discount amount
  IF coupon_record.discount_type = 'percentage' THEN
    discount_amount := (cart_amount * coupon_record.discount_value) / 100;
    
    -- Apply maximum discount if set
    IF coupon_record.maximum_discount IS NOT NULL AND discount_amount > coupon_record.maximum_discount THEN
      discount_amount := coupon_record.maximum_discount;
    END IF;
  ELSIF coupon_record.discount_type = 'fixed_amount' THEN
    discount_amount := coupon_record.discount_value;
    
    -- Don't exceed cart amount
    IF discount_amount > cart_amount THEN
      discount_amount := cart_amount;
    END IF;
  ELSIF coupon_record.discount_type = 'free_shipping' THEN
    -- Free shipping - discount amount is 0, but coupon is valid
    discount_amount := 0;
  END IF;

  -- Return success
  RETURN json_build_object(
    'is_valid', true,
    'discount_amount', discount_amount,
    'error_message', '',
    'coupon_id', coupon_record.id,
    'coupon_name', coupon_record.name,
    'discount_type', coupon_record.discount_type,
    'applies_to', coupon_record.applies_to
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, DECIMAL, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, DECIMAL, UUID) TO anon;

COMMENT ON FUNCTION validate_coupon IS 'Validates a coupon code and returns discount information';

