-- ==============================================================================
-- MYCHOICE.in - Guest Checkout Support (Optional Email & Phone-first Flow)
-- Migration: 20260928000001_guest_checkout_optional_email.sql
-- ==============================================================================

-- 1. Make email column nullable on orders to allow guest checkout with phone number
ALTER TABLE orders ALTER COLUMN email DROP NOT NULL;

-- 2. Ensure phone column exists on orders table for direct query access
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Ensure customer_name column exists on orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 4. Create index on phone for faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
