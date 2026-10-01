import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  canOrderBeFulfilled,
  fulfillLocalOrder,
  validateCJShippingAddress,
  resolveOrderCJMappings,
  isLiveCJFulfillmentEnabled,
} from "@/lib/cj/fulfillment";
import { dbStore } from "@/lib/db/client";
import { redactSensitiveData, logger } from "@/lib/security/logger";
import { handleAdminFulfillPost, handleAdminFulfillGet } from "@/lib/admin/cj-fulfillment";

describe("Phase 3: CJ Dropshipping Fulfillment Integration", () => {
  const validShippingAddress = {
    fullName: "Alexander Hamilton",
    phone: "+1 555-0199",
    addressLine1: "55 Wall Street",
    addressLine2: "Suite 400",
    city: "New York",
    state: "NY",
    postalCode: "10005",
    country: "United States",
    countryCode: "US",
  };

  const sampleMappedItems = [
    {
      productId: "prod_diffuser_1",
      variantId: "var_diffuser_1",
      productName: "Curated Aroma Diffuser",
      sku: "CJ-DIF-01",
      quantity: 1,
      unitPrice: 45.0,
      totalPrice: 45.0,
      cjProductId: "cj_prod_diffuser",
      cjVariantId: "vid_cj_diffuser_101",
    },
  ];

  // Helper to create order with captured payment
  function createTestOrder(overrides: {
    paymentStatus?: string;
    orderStatus?: string;
    fulfillmentStatus?: string;
    totalAmount?: number;
    currency?: string;
    shippingAddress?: any;
    items?: any[];
    cjOrderId?: string;
  } = {}) {
    const id = `ord_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalAmount = overrides.totalAmount !== undefined ? overrides.totalAmount : 45.0;
    const currency = overrides.currency || "USD";
    const paymentStatus = (overrides.paymentStatus || "paid") as any;
    const orderStatus = (overrides.orderStatus || "confirmed") as any;

    const order = dbStore.createOrder({
      id,
      orderNumber: `ORD-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      email: "alexander.hamilton@example.com",
      currency,
      subtotal: totalAmount,
      shippingAmount: 0.0,
      discountAmount: 0.0,
      taxAmount: 0.0,
      totalAmount,
      paymentStatus,
      orderStatus,
      fulfillmentStatus: (overrides.fulfillmentStatus as any) || "unfulfilled",
      shippingAddress: overrides.shippingAddress !== undefined ? overrides.shippingAddress : validShippingAddress,
      items: overrides.items || sampleMappedItems,
      cjOrderId: overrides.cjOrderId,
    });

    // Create payment record if order paymentStatus is paid or failed
    if (paymentStatus === "paid") {
      dbStore.createPayment({
        orderId: id,
        provider: "cashfree",
        providerPaymentId: `cf_pay_${Date.now()}`,
        amount: totalAmount,
        currency,
        status: "captured",
        refundStatus: "none",
        refundAmount: 0,
        paidAt: new Date().toISOString(),
      });
    } else if (paymentStatus === "failed") {
      dbStore.createPayment({
        orderId: id,
        provider: "cashfree",
        amount: totalAmount,
        currency,
        status: "failed",
        failureCode: "PAYMENT_DECLINED",
        failureReason: "Card declined by issuing bank",
        refundStatus: "none",
        refundAmount: 0,
      });
    }

    return order;
  }

  // =========================================================================
  // 1. PAYMENT GATE (Section 8 & 15)
  // =========================================================================
  describe("1. Payment Gate & Fulfillment Eligibility", () => {
    it("allows a paid order with captured payment to enter fulfillment", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });
      const eligibility = await canOrderBeFulfilled(order.id);

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.code).toBe("ELIGIBLE");
      expect(eligibility.shippingAddress).toBeDefined();
      expect(eligibility.items?.length).toBe(1);
    });

    it("strictly blocks fulfillment for pending (unpaid) order", async () => {
      const order = createTestOrder({ paymentStatus: "pending" });
      const eligibility = await canOrderBeFulfilled(order.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("PAYMENT_NOT_CAPTURED");

      // Attempt fulfillment: MUST be rejected
      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.status).toBe("manual_review");
      expect(fulfillRes.cjOrderId).toBeUndefined();
    });

    it("strictly blocks fulfillment for failed payment order", async () => {
      const order = createTestOrder({ paymentStatus: "failed" });
      const eligibility = await canOrderBeFulfilled(order.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("PAYMENT_FAILED");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.cjOrderId).toBeUndefined();
    });

    it("strictly blocks fulfillment for cancelled order", async () => {
      const order = createTestOrder({ paymentStatus: "paid", orderStatus: "cancelled" });
      const eligibility = await canOrderBeFulfilled(order.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("ORDER_CANCELLED");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.cjOrderId).toBeUndefined();
    });

    it("strictly blocks fulfillment for refunded order", async () => {
      const order = createTestOrder({ paymentStatus: "paid", orderStatus: "refunded" });
      const eligibility = await canOrderBeFulfilled(order.id);

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("ORDER_REFUNDED");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.cjOrderId).toBeUndefined();
    });

    it("strictly blocks fulfillment if payment amount does not match order total", async () => {
      const order = createTestOrder({ paymentStatus: "paid", totalAmount: 45.0 });
      // Tamper with payment amount
      const payment = dbStore.getPaymentByOrderId(order.id);
      if (payment) {
        dbStore.updatePayment(payment.id, { amount: 10.0 });
      }

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("PAYMENT_AMOUNT_MISMATCH");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
    });

    it("strictly blocks fulfillment if payment currency does not match order currency", async () => {
      const order = createTestOrder({ paymentStatus: "paid", currency: "USD" });
      const payment = dbStore.getPaymentByOrderId(order.id);
      if (payment) {
        dbStore.updatePayment(payment.id, { currency: "INR" });
      }

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("PAYMENT_CURRENCY_MISMATCH");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. PRODUCT AND VARIANT MAPPING (Section 7)
  // =========================================================================
  describe("2. Product and Variant Mapping Resolution", () => {
    it("resolves valid CJ variant mapping successfully", async () => {
      const items = [
        {
          productId: "prod_1",
          variantId: "var_1",
          productName: "Valid Item",
          sku: "SKU-001",
          quantity: 2,
          cjVariantId: "vid_official_cj_999",
        },
      ];

      const res = await resolveOrderCJMappings(items);
      expect(res.valid).toBe(true);
      expect(res.products.length).toBe(1);
      expect(res.products[0].vid).toBe("vid_official_cj_999");
      expect(res.products[0].quantity).toBe(2);
    });

    it("blocks fulfillment when line item lacks CJ variant mapping", async () => {
      const unmappedItems = [
        {
          productId: "prod_unmapped_1",
          variantId: "var_unmapped_1",
          productName: "Unmapped Artisan Mug",
          sku: "MUG-UNMAPPED-01",
          quantity: 1,
          unitPrice: 20.0,
          totalPrice: 20.0,
          // cjVariantId missing!
        },
      ];

      const order = createTestOrder({
        paymentStatus: "paid",
        items: unmappedItems,
      });

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("UNMAPPED_VARIANTS");
      expect(eligibility.unmappedItems?.length).toBe(1);

      // Attempt fulfillment: MUST be blocked
      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.code).toBe("UNMAPPED_VARIANTS");
      expect(fulfillRes.status).toBe("manual_review");

      // Verify order is preserved as manual_review with actionable failure note
      const stored = dbStore.getOrder(order.id);
      expect(stored?.fulfillmentStatus).toBe("manual_review");
      expect(stored?.internalNotes).toContain("UNMAPPED_VARIANTS");

      // Verify cj_order_sync recorded the error
      const syncRecord = dbStore.getCJOrderSync(order.id);
      expect(syncRecord?.syncStatus).toBe("manual_review");
      expect(syncRecord?.errorMessage).toContain("UNMAPPED_VARIANTS");
    });

    it("blocks fulfillment when order items array is empty", async () => {
      const order = createTestOrder({
        paymentStatus: "paid",
        items: [],
      });

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("EMPTY_ITEMS");
    });
  });

  // =========================================================================
  // 3. SHIPPING ADDRESS VALIDATION (Section 10)
  // =========================================================================
  describe("3. Shipping Address Validation & CJ Mapping", () => {
    it("validates and normalizes complete American shipping address", () => {
      const res = validateCJShippingAddress(validShippingAddress);
      expect(res.valid).toBe(true);
      expect(res.address?.countryCode).toBe("US");
      expect(res.address?.country).toBe("United States");
      expect(res.address?.city).toBe("New York");
      expect(res.address?.state).toBe("NY");
      expect(res.address?.postalCode).toBe("10005");
      expect(res.address?.phone).toBe("+1 555-0199");
    });

    it("normalizes country variations (e.g. USA, UK, India, Australia)", () => {
      expect(validateCJShippingAddress({ ...validShippingAddress, country: "USA", countryCode: "" }).address?.countryCode).toBe("US");
      expect(validateCJShippingAddress({ ...validShippingAddress, country: "India", countryCode: "" }).address?.countryCode).toBe("IN");
      expect(validateCJShippingAddress({ ...validShippingAddress, country: "United Kingdom", countryCode: "" }).address?.countryCode).toBe("GB");
      expect(validateCJShippingAddress({ ...validShippingAddress, country: "Canada", countryCode: "" }).address?.countryCode).toBe("CA");
      expect(validateCJShippingAddress({ ...validShippingAddress, country: "Australia", countryCode: "" }).address?.countryCode).toBe("AU");
    });

    it("blocks fulfillment when recipient name is missing or too short", () => {
      const invalid = { ...validShippingAddress, fullName: "A" };
      const res = validateCJShippingAddress(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("recipient name");
    });

    it("blocks fulfillment when contact phone is missing", () => {
      const invalid = { ...validShippingAddress, phone: "" };
      const res = validateCJShippingAddress(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("phone number");
    });

    it("blocks fulfillment when street address is missing", () => {
      const invalid = { ...validShippingAddress, addressLine1: "" };
      const res = validateCJShippingAddress(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("street address");
    });

    it("blocks fulfillment when city or postal code is missing", () => {
      expect(validateCJShippingAddress({ ...validShippingAddress, city: "" }).valid).toBe(false);
      expect(validateCJShippingAddress({ ...validShippingAddress, postalCode: "" }).valid).toBe(false);
    });

    it("blocks order fulfillment if shipping address is completely missing", async () => {
      const order = createTestOrder({
        paymentStatus: "paid",
        shippingAddress: null,
      });

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("INVALID_SHIPPING_ADDRESS");

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(false);
      expect(fulfillRes.status).toBe("manual_review");
    });
  });

  // =========================================================================
  // 4. CJ ORDER CREATION & IDEMPOTENCY (Section 9, 11, 14)
  // =========================================================================
  describe("4. Order Creation, State Machine & Idempotency", () => {
    it("creates CJ order successfully for eligible paid order and stores CJ order ID", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(true);
      expect(fulfillRes.cjOrderId).toBeDefined();
      expect(fulfillRes.cjOrderNumber).toBeDefined();
      expect(fulfillRes.status).toBe("submitted_to_cj");
      expect(fulfillRes.requiresBalancePayment).toBe(true);

      // Verify order record updated in store
      const updatedOrder = dbStore.getOrder(order.id);
      expect(updatedOrder?.cjOrderId).toBe(fulfillRes.cjOrderId);
      expect(updatedOrder?.fulfillmentStatus).toBe("submitted_to_cj");

      // Verify cj_order_sync updated
      const syncRow = dbStore.getCJOrderSync(order.id);
      expect(syncRow).toBeDefined();
      expect(syncRow?.cjOrderId).toBe(fulfillRes.cjOrderId);
      expect(syncRow?.syncStatus).toBe("submitted_awaiting_payment");

      // Verify fulfillment attempt ledger recorded
      const attempts = dbStore.getCJFulfillmentAttemptsByOrderId(order.id);
      expect(attempts.length).toBeGreaterThanOrEqual(1);
      expect(attempts[0].status).toBe("submitted");
      expect(attempts[0].cjOrderId).toBe(fulfillRes.cjOrderId);
    });

    it("idempotently returns existing CJ order on repeat calls without re-creating", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      // First call
      const firstRes = await fulfillLocalOrder(order.id);
      expect(firstRes.success).toBe(true);
      const originalCjId = firstRes.cjOrderId;

      // Second call (e.g. duplicate webhook, retry button, or page reload)
      const secondRes = await fulfillLocalOrder(order.id);
      expect(secondRes.success).toBe(true);
      expect(secondRes.cjOrderId).toBe(originalCjId);
      expect(secondRes.message).toContain("Duplicate prevented");

      // Third call
      const thirdRes = await fulfillLocalOrder(order.id);
      expect(thirdRes.success).toBe(true);
      expect(thirdRes.cjOrderId).toBe(originalCjId);
    });

    it("checks idempotency across cj_order_sync ledger", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });
      const syntheticCjId = "CJ_PREEXISTING_ORDER_999";

      // Pre-seed cj_order_sync ledger as already submitted
      dbStore.upsertCJOrderSync({
        orderId: order.id,
        cjOrderId: syntheticCjId,
        syncStatus: "submitted_awaiting_payment",
      });

      const eligibility = await canOrderBeFulfilled(order.id);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.code).toBe("ALREADY_SUBMITTED");
      expect(eligibility.cjOrderId).toBe(syntheticCjId);

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(true);
      expect(fulfillRes.cjOrderId).toBe(syntheticCjId);
      expect(fulfillRes.message).toContain("Duplicate prevented");
    });
  });

  // =========================================================================
  // 5. LIVE SAFETY & PRODUCTION GUARDS (Section 20 & 21)
  // =========================================================================
  describe("5. Live Safety & Safe Environment Guards", () => {
    it("guarantees live fulfillment is disabled by default to protect funds", () => {
      // In development/test default environment
      expect(isLiveCJFulfillmentEnabled()).toBe(false);
    });

    it("only enables live fulfillment when CJ_LIVE_FULFILLMENT_ENABLED=true and CJ_MODE=production", () => {
      const origEnabled = process.env.CJ_LIVE_FULFILLMENT_ENABLED;
      const origMode = process.env.CJ_MODE;
      const origKey = process.env.CJ_API_KEY;

      try {
        process.env.CJ_LIVE_FULFILLMENT_ENABLED = "false";
        process.env.CJ_MODE = "test";
        expect(isLiveCJFulfillmentEnabled()).toBe(false);

        process.env.CJ_LIVE_FULFILLMENT_ENABLED = "true";
        process.env.CJ_MODE = "test";
        expect(isLiveCJFulfillmentEnabled()).toBe(false);

        process.env.CJ_LIVE_FULFILLMENT_ENABLED = "true";
        process.env.CJ_MODE = "production";
        process.env.CJ_API_KEY = "test_api_key";
        expect(isLiveCJFulfillmentEnabled()).toBe(true);
      } finally {
        process.env.CJ_LIVE_FULFILLMENT_ENABLED = origEnabled;
        process.env.CJ_MODE = origMode;
        process.env.CJ_API_KEY = origKey;
      }
    });
  });

  // =========================================================================
  // 6. SERVER-SIDE ADMIN API ROUTE & SECURITY (Section 16, 17, 18)
  // =========================================================================
  describe("6. Server-Side Admin API Route & Security Protection", () => {
    it("rejects unauthorized client requests to the admin fulfillment endpoint", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const req = new NextRequest(`https://mychoice.in/api/admin/cj/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: {
          "x-admin-role": "unauthorized",
        },
      });

      const res = await handleAdminFulfillPost(req, {
        params: Promise.resolve({ orderId: order.id }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("allows authorized administrator to trigger fulfillment server-side", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const req = new NextRequest(`https://mychoice.in/api/admin/cj/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: {
          "x-admin-role": "admin",
        },
      });

      const res = await handleAdminFulfillPost(req, {
        params: Promise.resolve({ orderId: order.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cjOrderId).toBeDefined();
      expect(data.status).toBe("submitted_to_cj");
      expect(data.requiresBalancePayment).toBe(true);

      // Verify no sensitive keys leaked in API response
      expect(data.apiKey).toBeUndefined();
      expect(data.secret).toBeUndefined();
      expect(data.token).toBeUndefined();
      expect(data.cashfreeSecret).toBeUndefined();
    });

    it("admin endpoint prevents duplicate fulfillment on retry", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const req = new NextRequest(`https://mychoice.in/api/admin/cj/orders/${order.id}/fulfill`, {
        method: "POST",
        headers: {
          "x-admin-role": "admin",
        },
      });

      // First call
      const res1 = await handleAdminFulfillPost(req, {
        params: Promise.resolve({ orderId: order.id }),
      });
      const data1 = await res1.json();
      expect(data1.success).toBe(true);
      const firstCjId = data1.cjOrderId;

      // Second call (Admin clicks retry)
      const res2 = await handleAdminFulfillPost(req, {
        params: Promise.resolve({ orderId: order.id }),
      });
      const data2 = await res2.json();
      expect(data2.success).toBe(true);
      expect(data2.cjOrderId).toBe(firstCjId);
      expect(data2.message).toContain("Duplicate prevented");
    });

    it("admin GET endpoint reports fulfillment eligibility correctly", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const req = new NextRequest(`https://mychoice.in/api/admin/cj/orders/${order.id}/fulfill`, {
        method: "GET",
        headers: {
          "x-admin-role": "admin",
        },
      });

      const res = await handleAdminFulfillGet(req, {
        params: Promise.resolve({ orderId: order.id }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.eligible).toBe(true);
      expect(data.code).toBe("ELIGIBLE");
      expect(data.hasShippingAddress).toBe(true);
    });
  });

  // =========================================================================
  // 7. OBSERVABILITY & SECRET REDACTION (Section 22)
  // =========================================================================
  describe("7. Observability, Logging & Secret Redaction", () => {
    it("redacts CJ tokens, API keys, and sensitive fields from log payloads", () => {
      const sensitivePayload = {
        orderId: "ord_123",
        apiKey: "cj_secret_api_key_12345",
        client_secret: "secret_abcd_xyz",
        accessToken: "cjat_eyJhbGciOi...",
        password: "secret_user_password",
        authorization: "Bearer my_secret_token",
        cardNumber: "4111 1111 1111 1111",
        customerName: "John Doe",
      };

      const redacted = redactSensitiveData(sensitivePayload);
      expect(redacted.apiKey).toBe("[REDACTED]");
      expect(redacted.client_secret).toBe("[REDACTED]");
      expect(redacted.accessToken).toBe("[REDACTED]");
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.authorization).toBe("[REDACTED]");
      expect(redacted.cardNumber).toBe("[REDACTED]");
      expect(redacted.orderId).toBe("ord_123");

      // Verify credit card number masking in unstructured strings
      const stringLog = redactSensitiveData("Customer card 4111 1111 1111 1111 captured");
      expect(stringLog).toContain("[REDACTED_CARD]");
    });
  });

  // =========================================================================
  // 8. DATA INTEGRITY & AUTHORITATIVE PRICING (Section 18)
  // =========================================================================
  describe("8. Data Integrity & Mapping Fidelity", () => {
    it("ensures CJ order payload uses authoritative server order number and variant IDs", async () => {
      const order = createTestOrder({ paymentStatus: "paid" });

      const fulfillRes = await fulfillLocalOrder(order.id);
      expect(fulfillRes.success).toBe(true);

      const attempt = dbStore.getCJFulfillmentAttempt(`cj_fulfill_${order.id}`);
      expect(attempt).toBeDefined();
      expect(attempt?.payload).toBeDefined();

      const payload = attempt?.payload;
      expect(payload.orderNumber).toBe(order.orderNumber);
      expect(payload.shippingCustomerName).toBe(validShippingAddress.fullName);
      expect(payload.shippingCountryCode).toBe("US");
      expect(payload.payType).toBe(3); // PayType 3 = Pay later (Zero auto wallet deduction)
      expect(payload.products.length).toBe(1);
      expect(payload.products[0].vid).toBe("vid_cj_diffuser_101");
      expect(payload.products[0].quantity).toBe(1);
    });
  });
});
