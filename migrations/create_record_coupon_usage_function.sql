-- =====================================================
-- Create record_coupon_usage Function
-- =====================================================
-- This function records coupon usage when an order is placed

CREATE OR REPLACE FUNCTION record_coupon_usage(
  coupon_id_param UUID,
  user_id_param UUID,
  order_id_param UUID,
  discount_amount_param DECIMAL,
  order_total_param DECIMAL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert usage record
  INSERT INTO coupon_usage (
    coupon_id,
    user_id,
    order_id,
    discount_amount,
    order_total
  ) VALUES (
    coupon_id_param,
    user_id_param,
    order_id_param,
    discount_amount_param,
    order_total_param
  );

  -- Increment used_count in coupons table
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE id = coupon_id_param;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_coupon_usage(UUID, UUID, UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION record_coupon_usage(UUID, UUID, UUID, DECIMAL, DECIMAL) TO service_role;

COMMENT ON FUNCTION record_coupon_usage IS 'Records coupon usage and increments the used_count';

