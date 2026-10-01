-- ==============================================================================
-- MYCHOICE.in - Production Payment Gateway, Refunds & Webhook Ledger Schema
-- Migration: 20260927000003_production_payments.sql
-- ==============================================================================

-- 1. EXTEND PAYMENTS TABLE
-- Safely add production ledger and gateway metadata columns if they do not exist
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_signature TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'partial', 'full', 'failed'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (refund_amount >= 0);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update status constraint on payments table to support full payment state machine
DO $$
BEGIN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE payments ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('created', 'pending', 'authorized', 'captured', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Update status constraint on orders table to support payment state machine transitions
DO $$
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
        CHECK (payment_status IN ('unpaid', 'pending', 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'manual_review'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. PAYMENT WEBHOOK EVENTS LEDGER (Idempotency and Audit)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signature TEXT,
    payload_hash TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_payment_webhook_events_provider_event UNIQUE (provider, event_id)
);

-- 3. REFUNDS LEDGER
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_refund_id TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. NOTIFICATION EVENTS LEDGER (Email Idempotency)
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    event_reference TEXT NOT NULL,
    recipient TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'sent',
    CONSTRAINT uq_notification_events UNIQUE (order_id, notification_type, event_reference)
);

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_received ON payment_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_processed ON payment_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_notification_events_order ON notification_events(order_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Customers can view refunds for their own orders
DROP POLICY IF EXISTS "Customers view own refunds" ON refunds;
CREATE POLICY "Customers view own refunds"
    ON refunds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = refunds.order_id AND (
                (orders.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE customers.id = orders.customer_id AND customers.auth_user_id = auth.uid()))
                OR public.is_admin()
            )
        )
    );

DROP POLICY IF EXISTS "Admins manage refunds" ON refunds;
CREATE POLICY "Admins manage refunds"
    ON refunds FOR ALL
    USING (public.is_admin());

-- Webhook events: Strictly Admin and Service Role only
DROP POLICY IF EXISTS "Admins view webhook events" ON payment_webhook_events;
CREATE POLICY "Admins view webhook events"
    ON payment_webhook_events FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage webhook events" ON payment_webhook_events;
CREATE POLICY "Admins manage webhook events"
    ON payment_webhook_events FOR ALL
    USING (public.is_admin());

-- Notification events: Strictly Admin and Service Role only
DROP POLICY IF EXISTS "Admins view notification events" ON notification_events;
CREATE POLICY "Admins view notification events"
    ON notification_events FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage notification events" ON notification_events;
CREATE POLICY "Admins manage notification events"
    ON notification_events FOR ALL
    USING (public.is_admin());
