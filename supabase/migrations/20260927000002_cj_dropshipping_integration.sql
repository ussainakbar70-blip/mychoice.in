-- ==============================================================================
-- MYCHOICE.in - CJ Dropshipping Integration Migration
-- Migration: 20260927000002_cj_dropshipping_integration.sql
-- ==============================================================================

-- 1. Extend cj_products and cj_variants with synchronization metadata
ALTER TABLE cj_products 
  ADD COLUMN IF NOT EXISTS local_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error', 'unmapped')),
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_cj_products_local_id ON cj_products(local_product_id);
CREATE INDEX IF NOT EXISTS idx_cj_products_sync_status ON cj_products(sync_status);

ALTER TABLE cj_variants 
  ADD COLUMN IF NOT EXISTS local_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse TEXT DEFAULT 'CHINA',
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'low_stock', 'out_of_stock', 'sync_error', 'not_mapped')),
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_cj_variants_local_id ON cj_variants(local_variant_id);
CREATE INDEX IF NOT EXISTS idx_cj_variants_sync_status ON cj_variants(sync_status);

-- 2. Webhook Subscriptions Table (for product-specific subscriptions required after July 2026)
CREATE TABLE IF NOT EXISTS cj_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cj_product_id TEXT NOT NULL,
    local_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    topic TEXT NOT NULL CHECK (topic IN ('PRODUCT', 'STOCK', 'ORDER', 'LOGISTICS')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed', 'unsubscribed')),
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_event_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cj_product_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_cj_subscriptions_pid ON cj_webhook_subscriptions(cj_product_id);
CREATE INDEX IF NOT EXISTS idx_cj_subscriptions_topic ON cj_webhook_subscriptions(topic);
CREATE INDEX IF NOT EXISTS idx_cj_subscriptions_status ON cj_webhook_subscriptions(status);

-- 3. Fulfillment Attempts Table (Enforces strict fulfillment idempotency)
CREATE TABLE IF NOT EXISTS cj_fulfillment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    attempt_type TEXT NOT NULL DEFAULT 'create_order',
    idempotency_key TEXT NOT NULL UNIQUE,
    cj_order_id TEXT,
    cj_order_number TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'payment_required', 'failed', 'manual_review')),
    payload JSONB,
    response JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cj_attempts_order ON cj_fulfillment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_cj_attempts_cj_order ON cj_fulfillment_attempts(cj_order_id);
CREATE INDEX IF NOT EXISTS idx_cj_attempts_idempotency ON cj_fulfillment_attempts(idempotency_key);

-- 4. Tracking Checkpoint Events Table
CREATE TABLE IF NOT EXISTS cj_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number TEXT NOT NULL,
    carrier TEXT,
    checkpoint_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cj_tracking_order ON cj_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_cj_tracking_num ON cj_tracking_events(tracking_number);
CREATE INDEX IF NOT EXISTS idx_cj_tracking_time ON cj_tracking_events(checkpoint_time DESC);

-- 5. Synchronization Logs Table (Short, repeatable sync jobs audit trail)
CREATE TABLE IF NOT EXISTS cj_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'variant', 'inventory', 'order', 'tracking', 'auth', 'webhook')),
    entity_id TEXT,
    cj_entity_id TEXT,
    operation TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rate_limited', 'retry')),
    error_code TEXT,
    error_message TEXT,
    duration_ms INT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cj_sync_logs_type ON cj_sync_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_cj_sync_logs_status ON cj_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_cj_sync_logs_created ON cj_sync_logs(created_at DESC);

-- 6. Row Level Security Policies
ALTER TABLE cj_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_fulfillment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cj_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage cj_webhook_subscriptions') THEN
    CREATE POLICY "Admins manage cj_webhook_subscriptions" ON cj_webhook_subscriptions
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage cj_fulfillment_attempts') THEN
    CREATE POLICY "Admins manage cj_fulfillment_attempts" ON cj_fulfillment_attempts
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage cj_tracking_events') THEN
    CREATE POLICY "Admins manage cj_tracking_events" ON cj_tracking_events
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage cj_sync_logs') THEN
    CREATE POLICY "Admins manage cj_sync_logs" ON cj_sync_logs
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  -- Customer tracking read policy: Customers can only read tracking events for their own orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers view own tracking events') THEN
    CREATE POLICY "Customers view own tracking events" ON cj_tracking_events
      FOR SELECT TO authenticated
      USING (
        order_id IN (
          SELECT o.id FROM orders o
          JOIN customers c ON o.customer_id = c.id
          WHERE c.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;
