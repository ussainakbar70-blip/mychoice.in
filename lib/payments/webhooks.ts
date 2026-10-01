import crypto from "crypto";
import { getPaymentProvider } from "./provider";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { fulfillLocalOrder } from "@/lib/cj/orders";
import { emailService } from "@/lib/email";
import { assertValidPaymentTransition, isValidPaymentTransition, isValidOrderPaymentTransition } from "./state-machine";
import { PaymentStatus } from "./types";
import { toPaise } from "./money";

export interface WebhookProcessingResult {
  success: boolean;
  isDuplicate: boolean;
  eventId: string;
  eventType: string;
  message: string;
}

/**
 * Processes incoming Razorpay webhooks.
 * Strictly verifies HMAC signature on the RAW request body.
 * Enforces ledger-level idempotency via unique (provider, event_id).
 */
export async function processRazorpayWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<WebhookProcessingResult> {
  const provider = getPaymentProvider();

  // 1. Signature Verification on Raw Payload
  if (!signatureHeader) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "unknown",
      eventType: "unknown",
      message: "Missing signature header",
    };
  }

  const isValid = provider.verifyWebhook(rawBody, signatureHeader);
  if (!isValid) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "unknown",
      eventType: "unknown",
      message: "Invalid webhook signature",
    };
  }

  // 2. Parse Event Envelope
  const event = provider.parseWebhookEvent(rawBody);
  if (!event || !event.eventId) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "malformed",
      eventType: "malformed",
      message: "Malformed event envelope",
    };
  }

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

  // 3. Webhook Idempotency Check
  // Check local store
  const existingLocal = dbStore.getWebhookEvent(provider.name, event.eventId);
  if (existingLocal && existingLocal.processed) {
    return {
      success: true,
      isDuplicate: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: "Event already processed (Idempotent replay)",
    };
  }

  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: dupCheck } = await supabase
        .from("payment_webhook_events")
        .select("id, processed")
        .eq("provider", provider.name)
        .eq("event_id", event.eventId)
        .single();

      if (dupCheck && dupCheck.processed) {
        return {
          success: true,
          isDuplicate: true,
          eventId: event.eventId,
          eventType: event.eventType,
          message: "Event already processed in Supabase ledger (Idempotent replay)",
        };
      }
    } catch {
      // Continue
    }
  }

  // 4. Record Initial Ingestion in Ledger
  dbStore.recordWebhookEvent({
    provider: provider.name,
    eventId: event.eventId,
    eventType: event.eventType,
    signature: signatureHeader,
    payloadHash,
    payload: event.raw,
    processed: false,
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("payment_webhook_events").upsert(
        {
          provider: provider.name,
          event_id: event.eventId,
          event_type: event.eventType,
          signature: signatureHeader,
          payload_hash: payloadHash,
          payload: event.raw,
          processed: false,
        },
        { onConflict: "provider,event_id" }
      );
    } catch {
      // Fallback
    }
  }

  // 5. Route & Handle Lifecycle Events
  let processingError: string | null = null;

  try {
    switch (event.eventType) {
      case "payment.captured":
      case "order.paid": {
        await handlePaymentCapturedEvent(event);
        break;
      }

      case "payment.failed": {
        await handlePaymentFailedEvent(event);
        break;
      }

      case "refund.processed":
      case "refund.created": {
        await handleRefundProcessedEvent(event);
        break;
      }

      case "refund.failed": {
        await handleRefundFailedEvent(event);
        break;
      }

      default: {
        // Unknown or unhandled event: record without modifying payment state
        break;
      }
    }
  } catch (err: unknown) {
    processingError = err instanceof Error ? err.message : "Processing exception";
    console.error(`[Webhook ${event.eventType}] Error:`, err);
  }

  // 6. Mark Event Processed in Ledger
  const isProcessed = !processingError;
  dbStore.updateWebhookEvent(provider.name, event.eventId, {
    processed: isProcessed,
    processingError,
    processedAt: new Date().toISOString(),
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("payment_webhook_events")
        .update({
          processed: isProcessed,
          processing_error: processingError,
          processedAt: new Date().toISOString(),
        })
        .eq("provider", provider.name)
        .eq("event_id", event.eventId);
    } catch {
      // Fallback
    }
  }

  return {
    success: isProcessed,
    isDuplicate: false,
    eventId: event.eventId,
    eventType: event.eventType,
    message: isProcessed ? "Webhook processed successfully" : `Error: ${processingError}`,
  };
}

/**
 * Processes incoming Cashfree webhooks.
 * Strictly verifies HMAC signature on (timestamp + rawBody) using CASHFREE_WEBHOOK_SECRET / CASHFREE_SECRET_KEY.
 * Enforces ledger-level idempotency via unique (provider, event_id).
 */
export async function processCashfreeWebhook(params: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
}): Promise<WebhookProcessingResult> {
  const { rawBody, signatureHeader, timestampHeader } = params;
  const provider = getPaymentProvider();

  // 1. Signature Verification on Raw Payload + Timestamp
  if (!signatureHeader || !timestampHeader) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "unknown",
      eventType: "unknown",
      message: "Missing signature or timestamp header",
    };
  }

  const isValid = provider.verifyWebhook(rawBody, signatureHeader, timestampHeader);
  if (!isValid) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "unknown",
      eventType: "unknown",
      message: "Invalid Cashfree webhook signature",
    };
  }

  // 1b. Replay Protection: verify timestamp freshness
  if (timestampHeader) {
    const tsNum = Number(timestampHeader);
    const webhookTimeMs = !isNaN(tsNum)
      ? tsNum > 1e11 ? tsNum : tsNum * 1000
      : Date.parse(timestampHeader);

    if (!isNaN(webhookTimeMs)) {
      const ageMs = Math.abs(Date.now() - webhookTimeMs);
      const maxAgeMs = 20 * 60 * 1000; // 20 minutes replay tolerance
      if (ageMs > maxAgeMs) {
        return {
          success: false,
          isDuplicate: false,
          eventId: "expired",
          eventType: "expired",
          message: "Webhook timestamp expired (Replay protection)",
        };
      }
    }
  }

  // 2. Parse Event Envelope
  const event = provider.parseWebhookEvent(rawBody);
  if (!event || !event.eventId) {
    return {
      success: false,
      isDuplicate: false,
      eventId: "malformed",
      eventType: "malformed",
      message: "Malformed Cashfree event envelope",
    };
  }

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const providerName = "cashfree";

  // 3. Webhook Idempotency Check
  const existingLocal = dbStore.getWebhookEvent(providerName, event.eventId);
  if (existingLocal && existingLocal.processed) {
    return {
      success: true,
      isDuplicate: true,
      eventId: event.eventId,
      eventType: event.eventType,
      message: "Event already processed (Idempotent replay)",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: dupCheck } = await supabase
        .from("payment_webhook_events")
        .select("id, processed")
        .eq("provider", providerName)
        .eq("event_id", event.eventId)
        .single();

      if (dupCheck && dupCheck.processed) {
        return {
          success: true,
          isDuplicate: true,
          eventId: event.eventId,
          eventType: event.eventType,
          message: "Event already processed in Supabase ledger (Idempotent replay)",
        };
      }
    } catch {
      // Continue
    }
  }

  // 4. Record Initial Ingestion in Ledger
  dbStore.recordWebhookEvent({
    provider: providerName,
    eventId: event.eventId,
    eventType: event.eventType,
    signature: signatureHeader,
    payloadHash,
    payload: event.raw,
    processed: false,
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("payment_webhook_events").upsert(
        {
          provider: providerName,
          event_id: event.eventId,
          event_type: event.eventType,
          signature: signatureHeader,
          payload_hash: payloadHash,
          payload: event.raw,
          processed: false,
        },
        { onConflict: "provider,event_id" }
      );
    } catch {
      // Fallback
    }
  }

  // 5. Route & Handle Lifecycle Events
  let processingError: string | null = null;

  try {
    switch (event.eventType) {
      case "PAYMENT_SUCCESS_WEBHOOK":
      case "payment.captured":
      case "order.paid": {
        await handlePaymentCapturedEvent(event);
        break;
      }

      case "PAYMENT_FAILED_WEBHOOK":
      case "PAYMENT_USER_DROPPED_WEBHOOK":
      case "payment.failed": {
        await handlePaymentFailedEvent(event);
        break;
      }

      case "REFUND_STATUS_WEBHOOK":
      case "refund.processed":
      case "refund.created": {
        await handleRefundProcessedEvent(event);
        break;
      }

      default: {
        if (event.status === "captured") {
          await handlePaymentCapturedEvent(event);
        } else if (event.status === "failed") {
          await handlePaymentFailedEvent(event);
        } else if (event.status === "refunded") {
          await handleRefundProcessedEvent(event);
        }
        break;
      }
    }
  } catch (err: unknown) {
    processingError = err instanceof Error ? err.message : "Processing exception";
    console.error(`[Cashfree Webhook ${event.eventType}] Error:`, err);
  }

  // 6. Mark Event Processed in Ledger
  const isProcessed = !processingError;
  dbStore.updateWebhookEvent(providerName, event.eventId, {
    processed: isProcessed,
    processingError,
    processedAt: new Date().toISOString(),
  });

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("payment_webhook_events")
        .update({
          processed: isProcessed,
          processing_error: processingError,
          processedAt: new Date().toISOString(),
        })
        .eq("provider", providerName)
        .eq("event_id", event.eventId);
    } catch {
      // Fallback
    }
  }

  return {
    success: isProcessed,
    isDuplicate: false,
    eventId: event.eventId,
    eventType: event.eventType,
    message: isProcessed ? "Cashfree webhook processed successfully" : `Error: ${processingError}`,
  };
}


/**
 * Handles payment.captured / order.paid webhook events.
 * Transitions order and payment state to PAID / CAPTURED,
 * dispatches CJ dropshipping fulfillment, and triggers customer notifications.
 */
async function handlePaymentCapturedEvent(event: any): Promise<void> {
  const providerOrderId = event.providerOrderId;
  const providerPaymentId = event.providerPaymentId;
  const now = new Date().toISOString();

  // Find local payment
  let payment = dbStore.getPaymentByProviderOrderId(providerOrderId);
  if (!payment && providerPaymentId) {
    payment = dbStore.getPaymentByProviderPaymentId(providerPaymentId);
  }
  if (!payment && providerOrderId) {
    payment = dbStore.getPaymentByOrderId(providerOrderId);
  }
  if (!payment && providerOrderId) {
    const ordMatch = dbStore.getOrderByNumber(providerOrderId);
    if (ordMatch) payment = dbStore.getPaymentByOrderId(ordMatch.id);
  }

  let orderId: string | null = null;
  let orderNumber: string | null = null;

  if (payment) {
    orderId = payment.orderId;
    const ord = dbStore.getOrder(orderId);
    orderNumber = ord?.orderNumber || null;

    // Idempotency check: if payment already captured, no-op
    if (payment.status === "captured") {
      return;
    }

    // Amount & currency verification if provided in webhook event
    if (event.amount !== undefined && Math.abs(event.amount - payment.amount) > 0.01) {
      throw new Error(`Webhook payment amount mismatch: expected ${payment.amount} but received ${event.amount}`);
    }
    if (event.currency && payment.currency && event.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      throw new Error(`Webhook payment currency mismatch: expected ${payment.currency} but received ${event.currency}`);
    }

    if (!isValidPaymentTransition(payment.status as PaymentStatus, "captured")) {
      throw new Error(`Invalid payment state transition from '${payment.status}' to 'captured'`);
    }

    if (ord && !isValidOrderPaymentTransition(ord.paymentStatus, "paid")) {
      throw new Error(`Invalid order payment state transition from '${ord.paymentStatus}' to 'paid'`);
    }

    dbStore.updatePayment(payment.id, {
      providerPaymentId,
      status: "captured",
      paidAt: now,
      capturedAt: now,
    });

    if (ord && ord.paymentStatus !== "paid") {
      dbStore.updateOrder(ord.id, {
        paymentStatus: "paid",
        orderStatus: "confirmed",
      });
    }
  }

  // Update Supabase if connected
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      let query = supabase.from("payments").select("*");
      if (providerOrderId) {
        query = query.eq("provider_order_id", providerOrderId);
      } else if (providerPaymentId) {
        query = query.eq("provider_payment_id", providerPaymentId);
      }

      const { data: dbPay } = await query.single();
      if (dbPay) {
        orderId = orderId || dbPay.order_id;
        await supabase
          .from("payments")
          .update({
            provider_payment_id: providerPaymentId,
            status: "captured",
            paid_at: now,
            captured_at: now,
            updated_at: now,
          })
          .eq("id", dbPay.id);

        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            order_status: "confirmed",
            updated_at: now,
          })
          .eq("id", dbPay.order_id);
      }
    } catch {
      // Fallback
    }
  }

  // Trigger CJ Dropshipping Fulfillment Workflow (Rule 16)
  if (orderId) {
    try {
      await fulfillLocalOrder(orderId, { allowTestMode: true });
    } catch (cjErr) {
      console.warn("[Payments Webhook] Post-payment CJ fulfillment exception:", cjErr);
    }

    // Send confirmation email with idempotency
    try {
      const ord = dbStore.getOrder(orderId);
      if (ord && ord.email && !dbStore.hasNotificationEvent(ord.id, "payment_success", event.eventId)) {
        dbStore.recordNotificationEvent({
          orderId: ord.id,
          notificationType: "payment_success",
          eventReference: event.eventId,
          recipient: ord.email,
          status: "sent",
        });

        await emailService.send({
          to: { email: ord.email, name: ord.shippingAddress.fullName },
          subject: `Payment Confirmed: ${ord.orderNumber} | MYCHOICE.in`,
          template: "order_confirmation",
          data: {
            orderNumber: ord.orderNumber,
            total: ord.totalAmount,
            customerName: ord.shippingAddress.fullName,
            shippingAddress: ord.shippingAddress,
            items: ord.items,
          },
        });
      }
    } catch (emailErr) {
      console.warn("[Payments Webhook] Email notification error:", emailErr);
    }
  }
}

/**
 * Handles payment.failed webhook event.
 */
async function handlePaymentFailedEvent(event: any): Promise<void> {
  const providerOrderId = event.providerOrderId;
  const payment = dbStore.getPaymentByProviderOrderId(providerOrderId);

  if (payment && isValidPaymentTransition(payment.status as PaymentStatus, "failed")) {
    dbStore.updatePayment(payment.id, {
      status: "failed",
      failureCode: event.error?.code,
      failureReason: event.error?.description || "Payment failed at gateway",
    });
  }

  if (isSupabaseConfigured() && providerOrderId) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from("payments")
        .update({
          status: "failed",
          failure_code: event.error?.code,
          failure_reason: event.error?.description || "Payment failed at gateway",
          updated_at: new Date().toISOString(),
        })
        .eq("provider_order_id", providerOrderId);
    } catch {
      // Fallback
    }
  }
}

/**
 * Handles refund.processed / refund.created webhook event.
 */
async function handleRefundProcessedEvent(event: any): Promise<void> {
  const providerPaymentId = event.providerPaymentId;
  if (!providerPaymentId) return;

  const payment = dbStore.getPaymentByProviderPaymentId(providerPaymentId);
  const refundAmount = event.refund?.amount || 0;

  if (payment) {
    const isFullRefund = refundAmount >= payment.amount;
    const newStatus = isFullRefund ? "refunded" : "partially_refunded";

    dbStore.updatePayment(payment.id, {
      status: newStatus,
      refundStatus: isFullRefund ? "full" : "partial",
      refundAmount: Math.min(payment.amount, payment.refundAmount + refundAmount),
    });

    const ord = dbStore.getOrder(payment.orderId);
    if (ord && isFullRefund) {
      dbStore.updateOrder(ord.id, {
        paymentStatus: "refunded",
        orderStatus: "cancelled",
      });
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: dbPay } = await supabase
        .from("payments")
        .select("*")
        .eq("provider_payment_id", providerPaymentId)
        .single();

      if (dbPay) {
        const isFullRefund = refundAmount >= Number(dbPay.amount);
        const newStatus = isFullRefund ? "refunded" : "partially_refunded";

        await supabase
          .from("payments")
          .update({
            status: newStatus,
            refund_status: isFullRefund ? "full" : "partial",
            refund_amount: Number(dbPay.refund_amount || 0) + refundAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dbPay.id);

        if (isFullRefund) {
          await supabase
            .from("orders")
            .update({
              payment_status: "refunded",
              order_status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", dbPay.order_id);
        }
      }
    } catch {
      // Fallback
    }
  }
}

/**
 * Handles refund.failed webhook event.
 */
async function handleRefundFailedEvent(event: any): Promise<void> {
  console.warn(`[Payments Webhook] Refund failed: ${event.eventId}`);
}
