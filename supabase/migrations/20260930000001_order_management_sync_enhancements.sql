-- ==============================================================================
-- MYCHOICE.in - Order Management & Synchronization Enhancements
-- Migration: 20260930000001_order_management_sync_enhancements.sql
-- ==============================================================================

-- 1. Add structured shipping_address JSONB column to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- 2. Create GIN index for high-performance structured address querying
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address 
  ON orders USING GIN (shipping_address);

-- 3. Safely backfill existing JSON shipping address stored inside notes
DO $$
BEGIN
  UPDATE orders
  SET shipping_address = (notes::jsonb->'shippingAddress')
  WHERE shipping_address IS NULL
    AND notes IS NOT NULL
    AND notes ~ '^\s*\{.*\}\s*$'
    AND (notes::jsonb ? 'shippingAddress');
EXCEPTION
  WHEN OTHERS THEN
    -- Continue safely if any historical notes record is plain text
    NULL;
END $$;

-- 4. Ensure optimal composite and foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
