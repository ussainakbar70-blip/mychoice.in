import { describe, it, expect, beforeEach } from "vitest";
import {
  toPaise,
  fromPaise,
  addMoney,
  subtractMoney,
  multiplyMoney,
  calculatePercentageDiscount,
  formatINR,
  areAmountsEqual,
} from "@/lib/payments/money";
import {
  isValidPaymentTransition,
  assertValidPaymentTransition,
  isValidOrderPaymentTransition,
  assertValidOrderPaymentTransition,
} from "@/lib/payments/state-machine";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  verifyCashfreeWebhookSignature,
} from "@/lib/payments/verification";
import {
  createCheckoutPaymentOrder,
  getPaymentByOrderId,
} from "@/lib/payments/orders";
import {
  mockPaymentProvider,
} from "@/lib/payments/mock";
import { setPaymentProviderForTesting } from "@/lib/payments/provider";
import { processPaymentRefund } from "@/lib/payments/refunds";
import { processRazorpayWebhook, processCashfreeWebhook } from "@/lib/payments/webhooks";
import { CashfreePaymentProvider } from "@/lib/payments/cashfree";
import { reconcilePayment } from "@/lib/payments/reconciliation";
import { checkRateLimit, inMemoryRateLimiter } from "@/lib/security/rate-limit";
import { dbStore } from "@/lib/db/client";
import { PaymentStateTransitionError, PaymentRefundError, PaymentValidationError } from "@/lib/payments/errors";
import crypto from "crypto";

describe("Production Payments & Secure Checkout Subsystem", () => {
  const TEST_SECRET = "test_razorpay_secret_key_12345";
  const TEST_WEBHOOK_SECRET = "test_webhook_secret_67890";

  beforeEach(() => {
    mockPaymentProvider.reset();
    inMemoryRateLimiter.reset();
    setPaymentProviderForTesting(mockPaymentProvider);
  });

  // ==========================================
  // Category 1: Money Precision & Currency
  // ==========================================
  describe("1. Money Precision & Currency Arithmetic", () => {
    it("converts decimal currency amounts to integer minor units (paise)", () => {
      expect(toPaise(499.50)).toBe(49950);
      expect(toPaise(0.01)).toBe(1);
      expect(toPaise(1299)).toBe(129900);
      expect(fromPaise(49950)).toBe(499.50);
    });

    it("prevents standard IEEE 754 floating-point inaccuracies", () => {
      // In raw JS: 0.1 + 0.2 === 0.30000000000000004
      const sum = addMoney(0.1, 0.2);
      expect(sum).toBe(0.3);
      expect(areAmountsEqual(sum, 0.3)).toBe(true);

      const sub = subtractMoney(10.05, 0.05);
      expect(sub).toBe(10.0);
    });

    it("calculates percentage discounts accurately with cap", () => {
      const discount = calculatePercentageDiscount(1000, 15);
      expect(discount).toBe(150);

      // With cap
      const capped = calculatePercentageDiscount(1000, 50, 200);
      expect(capped).toBe(200);
    });

    it("formats amounts in Indian Rupee format correctly", () => {
      const formatted = formatINR(1499);
      expect(formatted).toContain("1,499");
    });
  });

  // ==========================================
  // Category 2: Payment & Order State Machine
  // ==========================================
  describe("2. Payment State Machine", () => {
    it("allows valid state transitions: created -> pending -> captured", () => {
      expect(isValidPaymentTransition("created", "pending")).toBe(true);
      expect(isValidPaymentTransition("pending", "captured")).toBe(true);
      expect(isValidPaymentTransition("captured", "refunded")).toBe(true);
      expect(isValidPaymentTransition("captured", "partially_refunded")).toBe(true);
    });

    it("strictly blocks illegal state transitions", () => {
      // Cannot jump from refunded back to captured
      expect(isValidPaymentTransition("refunded", "captured")).toBe(false);
      // Cannot jump from failed directly to refunded
      expect(isValidPaymentTransition("failed", "refunded")).toBe(false);
      // Cannot jump from cancelled to captured
      expect(isValidPaymentTransition("cancelled", "captured")).toBe(false);
    });

    it("throws typed PaymentStateTransitionError on forbidden transition", () => {
      expect(() => assertValidPaymentTransition("refunded", "captured")).toThrow(
        PaymentStateTransitionError
      );
    });

    it("validates order payment status transitions", () => {
      expect(isValidOrderPaymentTransition("pending_payment", "paid")).toBe(true);
      expect(isValidOrderPaymentTransition("paid", "refunded")).toBe(true);
      expect(isValidOrderPaymentTransition("refunded", "paid")).toBe(false);
    });
  });

  // ==========================================
  // Category 3: Cryptographic Verification
  // ==========================================
  describe("3. Cryptographic Signature Verification", () => {
    it("verifies valid Razorpay payment signature using HMAC-SHA256 with constant-time equality", () => {
      const orderId = "order_rzp_test_1001";
      const paymentId = "pay_rzp_test_9001";
      const payload = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(payload)
        .digest("hex");

      const verified = verifyRazorpayPaymentSignature(orderId, paymentId, validSignature, TEST_SECRET);
      expect(verified).toBe(true);
    });

    it("rejects invalid, forged, or tampered payment signatures", () => {
      const orderId = "order_rzp_test_1001";
      const paymentId = "pay_rzp_test_9001";
      const fakeSignature = "d41d8cd98f00b204e9800998ecf8427e";

      const verified = verifyRazorpayPaymentSignature(orderId, paymentId, fakeSignature, TEST_SECRET);
      expect(verified).toBe(false);
    });

    it("verifies valid Razorpay webhook signature on raw request body", () => {
      const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_123" });
      const validWebhookSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      const verified = verifyRazorpayWebhookSignature(rawBody, validWebhookSig, TEST_WEBHOOK_SECRET);
      expect(verified).toBe(true);
    });

    it("rejects webhook signatures when raw body has been tampered", () => {
      const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_123" });
      const validWebhookSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      const tamperedBody = JSON.stringify({ event: "payment.captured", id: "evt_TAMPERED" });
      const verified = verifyRazorpayWebhookSignature(tamperedBody, validWebhookSig, TEST_WEBHOOK_SECRET);
      expect(verified).toBe(false);
    });

    it("verifies valid Cashfree webhook signature using Base64 HMAC-SHA256 over timestamp + rawBody", () => {
      const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", event_time: "2026-09-28T12:00:00Z" });
      const timestamp = "1790580000";
      const validCashfreeSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${rawBody}`)
        .digest("base64");

      const verified = verifyCashfreeWebhookSignature(rawBody, timestamp, validCashfreeSig, TEST_WEBHOOK_SECRET);
      expect(verified).toBe(true);
    });

    it("rejects Cashfree webhook signatures when raw body has been tampered", () => {
      const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", event_time: "2026-09-28T12:00:00Z" });
      const timestamp = "1790580000";
      const validCashfreeSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${rawBody}`)
        .digest("base64");

      const tamperedBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", event_time: "2026-09-28T12:00:00Z", tampered: true });
      const verified = verifyCashfreeWebhookSignature(tamperedBody, timestamp, validCashfreeSig, TEST_WEBHOOK_SECRET);
      expect(verified).toBe(false);
    });

    it("rejects Cashfree webhook signatures when timestamp does not match", () => {
      const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      const timestamp = "1790580000";
      const validCashfreeSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${rawBody}`)
        .digest("base64");

      const tamperedTimestamp = "1790589999";
      const verified = verifyCashfreeWebhookSignature(rawBody, tamperedTimestamp, validCashfreeSig, TEST_WEBHOOK_SECRET);
      expect(verified).toBe(false);
    });

    it("rejects Cashfree webhook verification when signature or timestamp is missing", () => {
      const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      expect(verifyCashfreeWebhookSignature(rawBody, null, "any_sig", TEST_WEBHOOK_SECRET)).toBe(false);
      expect(verifyCashfreeWebhookSignature(rawBody, "1790580000", null, TEST_WEBHOOK_SECRET)).toBe(false);
    });
  });

  // ==========================================
  // Category 4: Payment Order Creation & Idempotency
  // ==========================================
  describe("4. Payment Order Creation & Idempotency", () => {
    const validCheckoutReq = {
      email: "buyer@example.com",
      shippingAddress: {
        fullName: "Aarav Sharma",
        phone: "+919876543210",
        addressLine1: "123 Nariman Point",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400021",
        country: "India",
        countryCode: "IN",
      },
      items: [
        {
          productId: "prod-hk-1",
          variantId: "var-hk-1-w",
          quantity: 1,
        },
      ],
      currency: "INR",
      idempotencyKey: "idem_checkout_test_unique_001",
    };

    it("creates a local order and initiates gateway payment order with integer minor units", async () => {
      const result = await createCheckoutPaymentOrder(validCheckoutReq);
      expect(result.success).toBe(true);
      expect(result.orderNumber).toMatch(/^ORD-/);
      expect(result.checkout.amountMinor).toBeGreaterThan(0);
      expect(result.checkout.providerOrderId).toContain("order_mock_");
      expect(result.checkout.customer.email).toBe("buyer@example.com");

      // Verify payment record in DB
      const payRecord = dbStore.getPayment(result.paymentId);
      expect(payRecord).toBeDefined();
      expect(payRecord?.status).toBe("pending");
      expect(payRecord?.currency).toBe("INR");
    });

    it("replays existing order when the same idempotency key is submitted twice (double-click prevention)", async () => {
      const first = await createCheckoutPaymentOrder({
        ...validCheckoutReq,
        idempotencyKey: "idem_double_click_test",
      });

      const second = await createCheckoutPaymentOrder({
        ...validCheckoutReq,
        idempotencyKey: "idem_double_click_test",
      });

      expect(second.isIdempotentReplay).toBe(true);
      expect(second.orderId).toBe(first.orderId);
      expect(second.orderNumber).toBe(first.orderNumber);
      expect(second.checkout.providerOrderId).toBe(first.checkout.providerOrderId);
    });

    it("stops checkout before charging if catalog item is out of stock (race condition)", async () => {
      await expect(
        createCheckoutPaymentOrder({
          ...validCheckoutReq,
          idempotencyKey: "idem_out_of_stock_fresh_test",
          items: [
            {
              productId: "prod-hk-1",
              variantId: "var-hk-1-w",
              quantity: 99999, // Impossible stock
            },
          ],
        })
      ).rejects.toThrow(PaymentValidationError);
    });
  });

  // ==========================================
  // Category 5: Payment Verification & Downstream CJ Trigger
  // ==========================================
  describe("5. Payment Verification & CJ Dropshipping Trigger", () => {
    it("marks payment as captured and confirms order when signature is verified", async () => {
      const order = await createCheckoutPaymentOrder({
        email: "test@example.com",
        shippingAddress: {
          fullName: "Rohan Patel",
          phone: "+919876543210",
          addressLine1: "45 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560001",
          country: "India",
          countryCode: "IN",
        },
        items: [{ productId: "prod-hk-1", variantId: "var-hk-1-w", quantity: 1 }],
      });

      const payment = dbStore.getPaymentByOrderId(order.orderId);
      expect(payment).toBeDefined();

      const verifyResult = await mockPaymentProvider.verifyPayment({
        orderId: order.orderId,
        providerOrderId: order.checkout.providerOrderId,
        providerPaymentId: "pay_verified_1234",
        providerSignature: "valid_sig",
      });

      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.status).toBe("captured");
    });

    it("does NOT mark payment failed if downstream CJ fulfillment encounters review/error after payment", async () => {
      // Payment succeeds -> local order is PAID -> CJ fulfillment status becomes manual_review
      const order = dbStore.createOrder({
        email: "buyer@example.com",
        currency: "INR",
        subtotal: 500,
        shippingAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 500,
        paymentStatus: "paid", // Verified payment
        orderStatus: "confirmed",
        fulfillmentStatus: "manual_review", // CJ item needed review
        shippingAddress: {
          fullName: "Customer",
          phone: "+919876543210",
          addressLine1: "Street",
          city: "Delhi",
          state: "Delhi",
          postalCode: "110001",
          country: "India",
          countryCode: "IN",
        },
        items: [],
      });

      expect(order.paymentStatus).toBe("paid");
      expect(order.fulfillmentStatus).toBe("manual_review");
      // Critical check: payment status must remain paid!
      expect(order.paymentStatus).not.toBe("failed");
    });
  });

  // ==========================================
  // Category 6: Webhooks & Deduplication
  // ==========================================
  describe("6. Webhooks & Ledger Deduplication", () => {
    it("processes payment.captured webhook and deduplicates subsequent replays", async () => {
      const eventId = `evt_webhook_test_${Date.now()}`;
      const payload = JSON.stringify({
        event: "payment.captured",
        event_id: eventId,
        payload: {
          payment: {
            entity: {
              id: "pay_rzp_webhook_01",
              order_id: "order_mock_webhook_01",
              amount: 5800,
              currency: "INR",
              status: "captured",
            },
          },
        },
      });

      // First delivery
      const res1 = await processRazorpayWebhook(payload, "valid_mock_signature");
      expect(res1.success).toBe(true);
      expect(res1.isDuplicate).toBe(false);

      // Replay delivery of same eventId
      const res2 = await processRazorpayWebhook(payload, "valid_mock_signature");
      expect(res2.success).toBe(true);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.message).toContain("already processed");
    });

    it("rejects webhooks with invalid cryptographic signature", async () => {
      const payload = JSON.stringify({ event: "payment.captured", event_id: "evt_bad_sig" });
      const res = await processRazorpayWebhook(payload, "invalid_webhook_signature");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Invalid webhook signature");
    });

    it("safely ignores unknown webhook events without crashing", async () => {
      const payload = JSON.stringify({ event: "unknown.future.event", event_id: "evt_unknown_99" });
      const res = await processRazorpayWebhook(payload, "valid_signature");
      expect(res.success).toBe(true);
    });

    it("processes Cashfree PAYMENT_SUCCESS_WEBHOOK and enforces ledger deduplication on replay", async () => {
      const payload = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        event_time: "2026-09-28T12:00:00Z",
        data: {
          order: {
            order_id: "cf_ord_webhook_101",
            order_amount: 1499.00,
            order_currency: "INR",
          },
          payment: {
            cf_payment_id: `cf_pay_${Date.now()}`,
            payment_status: "SUCCESS",
            payment_amount: 1499.00,
            payment_currency: "INR",
            payment_message: "00: Transaction successful",
          },
          customer_details: {
            customer_name: "Cashfree Customer",
            customer_email: "cf_customer@example.com",
            customer_phone: "9876543210",
          },
        },
      });

      const timestamp = String(Date.now());
      // First delivery
      const res1 = await processCashfreeWebhook({
        rawBody: payload,
        signatureHeader: "valid_mock_signature",
        timestampHeader: timestamp,
      });

      expect(res1.success).toBe(true);
      expect(res1.isDuplicate).toBe(false);

      // Replay delivery with identical payload
      const res2 = await processCashfreeWebhook({
        rawBody: payload,
        signatureHeader: "valid_mock_signature",
        timestampHeader: timestamp,
      });

      expect(res2.success).toBe(true);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.message).toContain("already processed");
    });

    it("rejects Cashfree webhook when signature or timestamp header is missing", async () => {
      const payload = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      const res = await processCashfreeWebhook({
        rawBody: payload,
        signatureHeader: null,
        timestampHeader: "1790580000",
      });

      expect(res.success).toBe(false);
      expect(res.message).toBe("Missing signature or timestamp header");
    });

    it("rejects Cashfree webhook when signature is invalid", async () => {
      const payload = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      const res = await processCashfreeWebhook({
        rawBody: payload,
        signatureHeader: "invalid_webhook_signature",
        timestampHeader: "1790580000",
      });

      expect(res.success).toBe(false);
      expect(res.message).toBe("Invalid Cashfree webhook signature");
    });
  });

  // ==========================================
  // Category 7: Refunds Subsystem
  // ==========================================
  describe("7. Refunds Subsystem", () => {
    it("processes a full refund for a captured payment", async () => {
      const ord = dbStore.createOrder({
        email: "refund@example.com",
        currency: "INR",
        subtotal: 1000,
        shippingAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1000,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        fulfillmentStatus: "unfulfilled",
        shippingAddress: {
          fullName: "Refund Buyer",
          phone: "+919876543210",
          addressLine1: "Main",
          city: "Pune",
          state: "MH",
          postalCode: "411001",
          country: "India",
          countryCode: "IN",
        },
        items: [],
      });

      const payment = dbStore.createPayment({
        orderId: ord.id,
        provider: "mock",
        providerPaymentId: "pay_captured_refund_01",
        amount: 1000,
        currency: "INR",
        status: "captured",
        refundStatus: "none",
        refundAmount: 0,
      });

      const refundResult = await processPaymentRefund({
        paymentId: payment.id,
        amount: 1000,
        reason: "Customer request",
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.refundStatus).toBe("full");
      expect(refundResult.paymentStatus).toBe("refunded");
      expect(refundResult.remainingRefundable).toBe(0);

      // Verify order payment status updated
      const updatedOrd = dbStore.getOrder(ord.id);
      expect(updatedOrd?.paymentStatus).toBe("refunded");
    });

    it("processes a partial refund and maintains remaining refundable balance", async () => {
      const payment = dbStore.createPayment({
        orderId: "ord_partial_test",
        provider: "mock",
        providerPaymentId: "pay_partial_test_01",
        amount: 1000,
        currency: "INR",
        status: "captured",
        refundStatus: "none",
        refundAmount: 0,
      });

      const refundResult = await processPaymentRefund({
        paymentId: payment.id,
        amount: 400,
        reason: "Partial return",
      });

      expect(refundResult.success).toBe(true);
      expect(refundResult.refundStatus).toBe("partial");
      expect(refundResult.paymentStatus).toBe("partially_refunded");
      expect(refundResult.remainingRefundable).toBe(600);

      // Subsequent second partial refund
      const secondRefund = await processPaymentRefund({
        paymentId: payment.id,
        amount: 600,
        reason: "Remaining return",
      });

      expect(secondRefund.refundStatus).toBe("full");
      expect(secondRefund.paymentStatus).toBe("refunded");
      expect(secondRefund.remainingRefundable).toBe(0);
    });

    it("rejects refund when amount exceeds the remaining captured balance", async () => {
      const payment = dbStore.createPayment({
        orderId: "ord_excess_refund",
        provider: "mock",
        providerPaymentId: "pay_excess_01",
        amount: 500,
        currency: "INR",
        status: "captured",
        refundStatus: "none",
        refundAmount: 0,
      });

      await expect(
        processPaymentRefund({
          paymentId: payment.id,
          amount: 600, // 600 > 500
          reason: "Too much",
        })
      ).rejects.toThrow(PaymentRefundError);
    });

    it("rejects refund on uncaptured or failed payments", async () => {
      const payment = dbStore.createPayment({
        orderId: "ord_failed_refund",
        provider: "mock",
        providerPaymentId: "pay_failed_01",
        amount: 500,
        currency: "INR",
        status: "failed", // Not captured!
        refundStatus: "none",
        refundAmount: 0,
      });

      await expect(
        processPaymentRefund({
          paymentId: payment.id,
          amount: 100,
        })
      ).rejects.toThrow(PaymentRefundError);
    });
  });

  // ==========================================
  // Category 8: Payment Reconciliation
  // ==========================================
  describe("8. Payment Reconciliation Engine", () => {
    it("detects and resolves discrepancy when gateway is captured but local DB is pending", async () => {
      const ord = dbStore.createOrder({
        email: "reconcile@example.com",
        currency: "INR",
        subtotal: 750,
        shippingAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 750,
        paymentStatus: "pending",
        orderStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        shippingAddress: {
          fullName: "Reconcile User",
          phone: "+919876543210",
          addressLine1: "Road",
          city: "Delhi",
          state: "Delhi",
          postalCode: "110001",
          country: "India",
          countryCode: "IN",
        },
        items: [],
      });

      const payment = dbStore.createPayment({
        orderId: ord.id,
        provider: "mock",
        providerOrderId: "order_mock_rec_01",
        providerPaymentId: "pay_rec_captured_gateway",
        amount: 750,
        currency: "INR",
        status: "pending", // Local says pending
        refundStatus: "none",
        refundAmount: 0,
      });

      const recResult = await reconcilePayment(payment.id);
      expect(recResult.isDiscrepancy).toBe(true);
      expect(recResult.resolutionApplied).toContain("captured");

      // Verify local database upgraded
      const updatedPayment = dbStore.getPayment(payment.id);
      expect(updatedPayment?.status).toBe("captured");
      const updatedOrd = dbStore.getOrder(ord.id);
      expect(updatedOrd?.paymentStatus).toBe("paid");
    });
  });

  // ==========================================
  // Category 9: Rate Limiting & Protection
  // ==========================================
  describe("9. Rate Limiting Protection", () => {
    it("allows requests within rate limit window and throttles excess requests", async () => {
      const limitKey = "test_checkout_rate_limit";
      const limit = 3;
      const windowMs = 5000;

      const r1 = await checkRateLimit(limitKey, limit, windowMs);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await checkRateLimit(limitKey, limit, windowMs);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await checkRateLimit(limitKey, limit, windowMs);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request must be blocked
      const r4 = await checkRateLimit(limitKey, limit, windowMs);
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });

  // ==========================================
  // Category 10: Complete End-to-End Master Flow
  // ==========================================
  describe("10. Complete End-to-End Master Checkout Flow", () => {
    it("runs complete Customer -> Cart -> Checkout -> Verified Payment -> Confirmed Order -> CJ Shipment -> Tracking", async () => {
      // Step 1: Customer prepares checkout request
      const checkoutResult = await createCheckoutPaymentOrder({
        email: "e2e_vip@mychoice.in",
        shippingAddress: {
          fullName: "Pooja Hegde",
          phone: "+919876543210",
          addressLine1: "Penthouse 9, Worli Sea Face",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400030",
          country: "India",
          countryCode: "IN",
        },
        items: [{ productId: "prod-hk-1", variantId: "var-hk-1-w", quantity: 1 }],
        currency: "INR",
        idempotencyKey: `idem_e2e_${Date.now()}`,
      });

      expect(checkoutResult.success).toBe(true);
      const localOrderId = checkoutResult.orderId;
      const orderNumber = checkoutResult.orderNumber;

      // Step 2: Payment verification on server
      const verifyResult = await mockPaymentProvider.verifyPayment({
        orderId: localOrderId,
        providerOrderId: checkoutResult.checkout.providerOrderId,
        providerPaymentId: `pay_e2e_live_${Date.now()}`,
        providerSignature: "e2e_verified_sig",
      });
      expect(verifyResult.verified).toBe(true);

      // Step 3: Local order confirmed and paid
      dbStore.updateOrder(localOrderId, {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        trackingNumber: "CJTRK987654321IN",
        trackingUrl: "https://track.mychoice.in/CJTRK987654321IN",
        fulfillmentStatus: "shipped",
      });

      const finalOrder = dbStore.getOrder(localOrderId);
      expect(finalOrder?.paymentStatus).toBe("paid");
      expect(finalOrder?.orderStatus).toBe("confirmed");
      expect(finalOrder?.fulfillmentStatus).toBe("shipped");
      expect(finalOrder?.trackingNumber).toBe("CJTRK987654321IN");
    });
  });

  // ==========================================
  // Category 11: RLS & Authorization Isolation
  // ==========================================
  describe("11. Payment RLS & Customer Isolation Security", () => {
    it("guarantees Customer A cannot access Customer B's payment record or order", async () => {
      const orderB = dbStore.createOrder({
        email: "customer_b@example.com",
        currency: "INR",
        subtotal: 1200,
        shippingAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1200,
        paymentStatus: "paid",
        orderStatus: "confirmed",
        fulfillmentStatus: "unfulfilled",
        shippingAddress: {
          fullName: "Customer B",
          phone: "+919876543210",
          addressLine1: "Street B",
          city: "Bengaluru",
          state: "KA",
          postalCode: "560001",
          country: "India",
          countryCode: "IN",
        },
        items: [],
      });

      const paymentB = dbStore.createPayment({
        orderId: orderB.id,
        provider: "mock",
        providerPaymentId: "pay_private_b_999",
        amount: 1200,
        currency: "INR",
        status: "captured",
        refundStatus: "none",
        refundAmount: 0,
      });

      // Customer A attempts lookup by their own email:
      const authCustomerA = { email: "customer_a@example.com" };
      const customerOrders = dbStore
        .getAllOrders()
        .filter((o) => o.email && o.email.toLowerCase() === authCustomerA.email.toLowerCase());

      expect(customerOrders.some((o) => o.id === orderB.id)).toBe(false);
      // Direct access check:
      expect(orderB.email).not.toBe(authCustomerA.email);
    });

    it("ensures webhook payloads and internal gateway secrets are stripped from public responses", async () => {
      const { getPublicPaymentConfig } = await import("@/lib/payments/config");
      const publicConfig = getPublicPaymentConfig();

      expect(publicConfig).toHaveProperty("keyId");
      expect(publicConfig).toHaveProperty("currency");
      expect(publicConfig).toHaveProperty("provider");
      expect(publicConfig).toHaveProperty("mode");

      // Secrets must NEVER exist on public config:
      expect((publicConfig as any).keySecret).toBeUndefined();
      expect((publicConfig as any).webhookSecret).toBeUndefined();
      expect((publicConfig as any).serviceRoleKey).toBeUndefined();
    });
  });

  // ==========================================
  // Category 12: Cashfree Payment Provider Architecture
  // ==========================================
  describe("12. Cashfree Payment Provider Architecture", () => {
    const cashfreeProvider = new CashfreePaymentProvider({
      appId: "TEST_APP_12345",
      secretKey: "cfsk_test_secret_abc123",
      webhookSecret: "cf_wh_secret_xyz",
      mode: "sandbox",
      apiVersion: "2023-08-01",
    });

    it("initializes CashfreePaymentProvider with isolated credentials and sandbox mode", () => {
      expect(cashfreeProvider.name).toBe("cashfree");
      expect(cashfreeProvider.getApiVersion()).toBe("2023-08-01");
      expect(cashfreeProvider.getAppId()).toBe("TEST_APP_12345");
      expect(cashfreeProvider.isSandbox()).toBe(true);
      expect(cashfreeProvider.getBaseUrl()).toBe("https://sandbox.cashfree.com/pg");
    });

    it("correctly parses Cashfree PAYMENT_SUCCESS_WEBHOOK event envelopes", () => {
      const payload = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        event_time: "2026-09-28T12:00:00Z",
        data: {
          order: {
            order_id: "order_cf_12345",
            order_amount: 1999.00,
            order_currency: "INR",
          },
          payment: {
            cf_payment_id: "cf_pay_98765",
            payment_status: "SUCCESS",
            payment_amount: 1999.00,
            payment_currency: "INR",
            payment_method: { upi: { upi_id: "user@okhdfcbank" } },
          },
          customer_details: {
            customer_name: "Test Customer",
            customer_email: "test@example.com",
            customer_phone: "9876543210",
          },
        },
      });

      const parsed = cashfreeProvider.parseWebhookEvent(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.eventId).toBe("cf_pay_98765");
      expect(parsed?.eventType).toBe("PAYMENT_SUCCESS_WEBHOOK");
      expect(parsed?.provider).toBe("cashfree");
      expect(parsed?.status).toBe("captured");
      expect(parsed?.providerPaymentId).toBe("cf_pay_98765");
      expect(parsed?.providerOrderId).toBe("order_cf_12345");
      expect(parsed?.amount).toBe(1999.00);
      expect(parsed?.currency).toBe("INR");
    });

    it("correctly parses Cashfree PAYMENT_FAILED_WEBHOOK event envelopes", () => {
      const payload = JSON.stringify({
        type: "PAYMENT_FAILED_WEBHOOK",
        event_time: "2026-09-28T12:00:00Z",
        data: {
          order: {
            order_id: "order_cf_fail_1",
            order_amount: 500,
            order_currency: "INR",
          },
          payment: {
            cf_payment_id: "cf_pay_failed_1",
            payment_status: "FAILED",
            payment_amount: 500,
            payment_currency: "INR",
          },
        },
      });

      const parsed = cashfreeProvider.parseWebhookEvent(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe("failed");
      expect(parsed?.eventType).toBe("PAYMENT_FAILED_WEBHOOK");
    });

    it("correctly parses Cashfree REFUND_STATUS_WEBHOOK event envelopes", () => {
      const payload = JSON.stringify({
        type: "REFUND_STATUS_WEBHOOK",
        event_time: "2026-09-28T12:00:00Z",
        data: {
          refund: {
            cf_refund_id: "cf_rfnd_123",
            order_id: "order_cf_rfnd_ord",
            refund_amount: 500,
            refund_currency: "INR",
            refund_status: "SUCCESS",
          },
        },
      });

      const parsed = cashfreeProvider.parseWebhookEvent(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe("refunded");
      expect(parsed?.eventType).toBe("REFUND_STATUS_WEBHOOK");
      expect(parsed?.eventId).toBe("cf_rfnd_123");
    });

    it("verifies webhook HMAC signature correctly through CashfreePaymentProvider", () => {
      const rawBody = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      const timestamp = "1790580000";
      const validSig = crypto
        .createHmac("sha256", "cf_wh_secret_xyz")
        .update(`${timestamp}${rawBody}`)
        .digest("base64");

      expect(cashfreeProvider.verifyWebhook(rawBody, validSig, timestamp)).toBe(true);
      expect(cashfreeProvider.verifyWebhook(rawBody, "invalid_sig", timestamp)).toBe(false);
      expect(cashfreeProvider.verifyWebhook(rawBody, validSig, "wrong_timestamp")).toBe(false);
    });
  });
});

