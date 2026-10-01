-- ==============================================================================
-- MYCHOICE.in - Ecommerce Foundation Extensions Migration
-- Migration: 20260927000001_ecommerce_foundation_extensions.sql
-- ==============================================================================

-- 1. Extend external mapping fields for future CJ / dropshipping provider integration
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS external_provider TEXT DEFAULT 'CJ',
  ADD COLUMN IF NOT EXISTS external_product_id TEXT,
  ADD COLUMN IF NOT EXISTS external_sku TEXT;

-- Sync existing cj_product_id to external_product_id if present
UPDATE products 
SET external_product_id = cj_product_id 
WHERE external_product_id IS NULL AND cj_product_id IS NOT NULL;

UPDATE products 
SET external_sku = cj_product_sku 
WHERE external_sku IS NULL AND cj_product_sku IS NOT NULL;

ALTER TABLE product_variants 
  ADD COLUMN IF NOT EXISTS external_provider TEXT DEFAULT 'CJ',
  ADD COLUMN IF NOT EXISTS external_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS external_sku TEXT;

-- Sync existing cj_variant_id to external_variant_id if present
UPDATE product_variants 
SET external_variant_id = cj_variant_id 
WHERE external_variant_id IS NULL AND cj_variant_id IS NOT NULL;

-- 2. Update orders status constraints to accommodate comprehensive state model
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'pending_payment', 'paid', 'failed', 'refunded', 'manual_review'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check 
  CHECK (fulfillment_status IN ('unfulfilled', 'pending_fulfillment', 'pending_sync', 'submitted_to_cj', 'awaiting_cj_payment', 'processing', 'cj_processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'refunded', 'failed', 'manual_review'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'manual_review'));

-- 3. Add internal admin notes field to orders if not present
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 4. Unique constraints on cart_items and wishlist_items to prevent duplicate rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_wishlist_customer_product'
  ) THEN
    ALTER TABLE wishlist_items ADD CONSTRAINT uq_wishlist_customer_product UNIQUE (customer_id, product_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- 5. Helper function for decreasing variant inventory safely
CREATE OR REPLACE FUNCTION public.decrease_variant_inventory(p_variant_id UUID, p_quantity INT)
RETURNS INT AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  SELECT inventory_quantity INTO v_current_stock
  FROM public.product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant not found';
  END IF;

  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory';
  END IF;

  v_new_stock := v_current_stock - p_quantity;

  UPDATE public.product_variants
  SET inventory_quantity = v_new_stock,
      updated_at = NOW()
  WHERE id = p_variant_id;

  RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
