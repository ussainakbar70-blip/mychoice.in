import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  toPaise,
  fromPaise,
  formatINR,
  areAmountsEqual,
} from "@/lib/payments/money";
import {
  isValidPaymentTransition,
  isValidOrderPaymentTransition,
} from "@/lib/payments/state-machine";
import {
  verifyCashfreeWebhookSignature,
} from "@/lib/payments/verification";
import {
  createCheckoutPaymentOrder,
} from "@/lib/payments/orders";
import {
  CashfreePaymentProvider,
} from "@/lib/payments/cashfree";
import {
  setPaymentProviderForTesting,
  getPaymentProvider,
} from "@/lib/payments/provider";
import {
  mockPaymentProvider,
} from "@/lib/payments/mock";
import {
  processCashfreeWebhook,
} from "@/lib/payments/webhooks";
import {
  dbStore,
} from "@/lib/db/client";
import {
  getPaymentMode,
  getServerCashfreeSecrets,
  getPublicPaymentConfig,
} from "@/lib/payments/config";
import {
  PaymentVerificationError,
  PaymentValidationError,
} from "@/lib/payments/errors";
import crypto from "crypto";

describe("Phase 2: Cashfree Payment Gateway Integration & Sandbox Validation", () => {
  const TEST_APP_ID = "TEST_APP_CF_890123";
  const TEST_SECRET_KEY = "cfsk_ma_test_secret_key_abcdef123456";
  const TEST_WEBHOOK_SECRET = "cf_whsec_test_sandbox_secret_999";

  let cashfreeProvider: CashfreePaymentProvider;

  beforeEach(() => {
    mockPaymentProvider.reset();
    setPaymentProviderForTesting(mockPaymentProvider);

    cashfreeProvider = new CashfreePaymentProvider({
      appId: TEST_APP_ID,
      secretKey: TEST_SECRET_KEY,
      webhookSecret: TEST_WEBHOOK_SECRET,
      mode: "sandbox",
      apiVersion: "2023-08-01",
    });
  });

  // =========================================================================
  // 1. Environment & Gateway Host Switching
  // =========================================================================
  describe("Phase 2A: Environment & Host Resolution", () => {
    it("resolves Cashfree sandbox endpoint when mode is test or sandbox", () => {
      const sandboxProvider = new CashfreePaymentProvider({
        appId: TEST_APP_ID,
        secretKey: TEST_SECRET_KEY,
        mode: "sandbox",
      });
      expect(sandboxProvider.getBaseUrl()).toBe("https://sandbox.cashfree.com/pg");
      expect(sandboxProvider.isSandbox()).toBe(true);
    });

    it("resolves Cashfree production endpoint when mode is live or production", () => {
      const prodProvider = new CashfreePaymentProvider({
        appId: TEST_APP_ID,
        secretKey: TEST_SECRET_KEY,
        mode: "production",
      });
      expect(prodProvider.getBaseUrl()).toBe("https://api.cashfree.com/pg");
      expect(prodProvider.isSandbox()).toBe(false);
    });

    it("normalizes PAYMENT_MODE environment variable cleanly", () => {
      const originalEnv = process.env.PAYMENT_MODE;
      try {
        process.env.PAYMENT_MODE = "sandbox";
        expect(getPaymentMode()).toBe("test");

        process.env.PAYMENT_MODE = "test";
        expect(getPaymentMode()).toBe("test");

        process.env.PAYMENT_MODE = "live";
        expect(getPaymentMode()).toBe("live");

        process.env.PAYMENT_MODE = "production";
        expect(getPaymentMode()).toBe("live");
      } finally {
        process.env.PAYMENT_MODE = originalEnv;
      }
    });
  });

  // =========================================================================
  // 2. Server-Authoritative Payment Creation
  // =========================================================================
  describe("Phase 2B: Authoritative Payment Creation", () => {
    const validCheckoutReq = {
      email: "priya.sharma@example.in",
      shippingAddress: {
        fullName: "Priya Sharma",
        phone: "+919876543210",
        addressLine1: "Flat 402, Lotus Residency",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400050",
        country: "India",
        countryCode: "IN",
      },
      items: [
        {
          productId: "prod-hk-1",
          variantId: "var-hk-1-w",
          quantity: 2,
        },
      ],
      currency: "INR",
      idempotencyKey: `idem_cf_test_${Date.now()}`,
    };

    it("creates Cashfree order with server-calculated price and authoritative UUID", async () => {
      const result = await createCheckoutPaymentOrder(validCheckoutReq);
      expect(result.success).toBe(true);

      // Verify UUID format (36 chars with hyphens)
      expect(result.orderId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.orderNumber).toMatch(/^ORD-202\d-\d{5}$/);
      expect(result.checkout.amount).toBeGreaterThan(0);
      expect(result.checkout.amountMinor).toBe(toPaise(result.checkout.amount));
      expect(result.checkout.currency).toBe("INR");
      expect(result.checkout.mode).toBe("test");

      // Verify payment record in DB
      const payRecord = dbStore.getPayment(result.paymentId);
      expect(payRecord).toBeDefined();
      expect(payRecord?.orderId).toBe(result.orderId);
      expect(payRecord?.status).toBe("pending");
    });

    it("rejects client attempts to tamper with prices or quantities", async () => {
      // Client cannot pass amount: request schema does not accept client-provided total
      await expect(
        createCheckoutPaymentOrder({
          ...validCheckoutReq,
          idempotencyKey: `idem_tamper_${Date.now()}`,
          items: [
            {
              productId: "prod-hk-1",
              variantId: "var-hk-1-w",
              quantity: 0, // Invalid quantity
            },
          ],
        })
      ).rejects.toThrow(PaymentValidationError);
    });

    it("rejects checkout if cart item inventory is insufficient", async () => {
      await expect(
        createCheckoutPaymentOrder({
          ...validCheckoutReq,
          idempotencyKey: `idem_inv_${Date.now()}`,
          items: [
            {
              productId: "prod-hk-1",
              variantId: "var-hk-1-w",
              quantity: 99999, // Exceeds available stock
            },
          ],
        })
      ).rejects.toThrow(PaymentValidationError);
    });
  });

  // =========================================================================
  // 3. Payment Verification
  // =========================================================================
  describe("Phase 2C: Cashfree Payment Verification", () => {
    it("successfully verifies PAID status, amount match, and currency match", async () => {
      // Mock global fetch for Cashfree REST API
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/orders/order_cf_verify_1/payments")) {
          return new Response(
            JSON.stringify([
              {
                cf_payment_id: 998877,
                payment_status: "SUCCESS",
                payment_amount: 1499.0,
                payment_currency: "INR",
                payment_group: "upi",
                customer_details: { customer_email: "test@example.com" },
              },
            ]),
            { status: 200 }
          );
        }
        if (urlStr.includes("/orders/order_cf_verify_1")) {
          return new Response(
            JSON.stringify({
              order_id: "order_cf_verify_1",
              order_status: "PAID",
              order_amount: 1499.0,
              order_currency: "INR",
              customer_details: { customer_email: "test@example.com" },
            }),
            { status: 200 }
          );
        }
        return new Response("Not found", { status: 404 });
      });

      const result = await cashfreeProvider.verifyPayment({
        orderId: "order_cf_verify_1",
        providerOrderId: "order_cf_verify_1",
        providerPaymentId: "998877",
        providerSignature: "cf_verified",
        expectedAmount: 1499.0,
        expectedCurrency: "INR",
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe("captured");
      expect(result.amount).toBe(1499.0);
      expect(result.currency).toBe("INR");
      expect(result.providerPaymentId).toBe("998877");
      expect(result.method).toBe("upi");

      fetchSpy.mockRestore();
    });

    it("rejects verification when Cashfree order amount does not match authoritative amount", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        return new Response(
          JSON.stringify({
            order_id: "order_cf_mismatch",
            order_status: "PAID",
            order_amount: 1000.0, // Amount captured is 1000, but order was 1499
            order_currency: "INR",
          }),
          { status: 200 }
        );
      });

      await expect(
        cashfreeProvider.verifyPayment({
          orderId: "order_cf_mismatch",
          providerOrderId: "order_cf_mismatch",
          providerPaymentId: "cf_pay_mismatch",
          providerSignature: "cf_verified",
          expectedAmount: 1499.0,
          expectedCurrency: "INR",
        })
      ).rejects.toThrow(/Payment amount mismatch/);

      fetchSpy.mockRestore();
    });

    it("rejects verification when Cashfree currency does not match authoritative currency", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        return new Response(
          JSON.stringify({
            order_id: "order_cf_curr_mismatch",
            order_status: "PAID",
            order_amount: 1499.0,
            order_currency: "USD", // Mismatch: captured USD instead of INR
          }),
          { status: 200 }
        );
      });

      await expect(
        cashfreeProvider.verifyPayment({
          orderId: "order_cf_curr_mismatch",
          providerOrderId: "order_cf_curr_mismatch",
          providerPaymentId: "cf_pay_curr",
          providerSignature: "cf_verified",
          expectedAmount: 1499.0,
          expectedCurrency: "INR",
        })
      ).rejects.toThrow(/Payment currency mismatch/);

      fetchSpy.mockRestore();
    });

    it("rejects verification when Cashfree order is ACTIVE or PENDING (unpaid)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
        return new Response(
          JSON.stringify({
            order_id: "order_cf_pending",
            order_status: "ACTIVE", // Customer has not completed payment yet
            order_amount: 1499.0,
            order_currency: "INR",
          }),
          { status: 200 }
        );
      });

      await expect(
        cashfreeProvider.verifyPayment({
          orderId: "order_cf_pending",
          providerOrderId: "order_cf_pending",
          providerPaymentId: "cf_pay_pending",
          providerSignature: "cf_verified",
          expectedAmount: 1499.0,
          expectedCurrency: "INR",
        })
      ).rejects.toThrow(/Cashfree order status is ACTIVE, not paid/);

      fetchSpy.mockRestore();
    });

    it("rejects verification when Cashfree order does not exist (404)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () => {
        return new Response(JSON.stringify({ message: "Order not found" }), { status: 404 });
      });

      await expect(
        cashfreeProvider.verifyPayment({
          orderId: "order_non_existent",
          providerOrderId: "order_non_existent",
          providerPaymentId: "cf_pay_none",
          providerSignature: "cf_verified",
          expectedAmount: 1499.0,
        })
      ).rejects.toThrow(/Order not found on Cashfree: HTTP 404/);

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // 4. Webhook Cryptographic Verification & Replay Protection
  // =========================================================================
  describe("Phase 2D: Cashfree Webhooks & Replay Protection", () => {
    it("verifies authentic HMAC-SHA256 signature over timestamp + rawBody", () => {
      const rawPayload = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        event_time: "2026-09-30T11:00:00Z",
        data: {
          order: { order_id: "order_cf_wh_1", order_amount: 899, order_currency: "INR" },
          payment: { cf_payment_id: "cf_pay_wh_1", payment_status: "SUCCESS", payment_amount: 899 },
        },
      });

      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${rawPayload}`)
        .digest("base64");

      expect(cashfreeProvider.verifyWebhook(rawPayload, validSig, timestamp)).toBe(true);
    });

    it("rejects tampered webhook payloads", () => {
      const originalPayload = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", amount: 100 });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${originalPayload}`)
        .digest("base64");

      const tamperedPayload = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", amount: 50000 });
      expect(cashfreeProvider.verifyWebhook(tamperedPayload, validSig, timestamp)).toBe(false);
    });

    it("rejects forged or modified timestamp in webhook signature", () => {
      const rawPayload = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK" });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${timestamp}${rawPayload}`)
        .digest("base64");

      const forgedTimestamp = String(Number(timestamp) + 100);
      expect(cashfreeProvider.verifyWebhook(rawPayload, validSig, forgedTimestamp)).toBe(false);
    });

    it("blocks expired webhook events via timestamp replay protection", async () => {
      // Timestamp from 2 hours ago
      const expiredTimestamp = String(Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000));
      const rawPayload = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: "order_expired_test" },
          payment: { cf_payment_id: "pay_expired_1", payment_status: "SUCCESS" },
        },
      });

      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${expiredTimestamp}${rawPayload}`)
        .digest("base64");

      // Temporarily set provider
      setPaymentProviderForTesting(cashfreeProvider);

      const result = await processCashfreeWebhook({
        rawBody: rawPayload,
        signatureHeader: validSig,
        timestampHeader: expiredTimestamp,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Webhook timestamp expired (Replay protection)");
    });

    it("safely ignores duplicate webhook events idempotently", async () => {
      const currentTimestamp = String(Math.floor(Date.now() / 1000));
      const rawPayload = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: "order_dup_wh" },
          payment: { cf_payment_id: "cf_pay_dup_999", payment_status: "SUCCESS" },
        },
      });

      const validSig = crypto
        .createHmac("sha256", TEST_WEBHOOK_SECRET)
        .update(`${currentTimestamp}${rawPayload}`)
        .digest("base64");

      setPaymentProviderForTesting(cashfreeProvider);

      // Pre-seed processed webhook event into DB ledger
      dbStore.recordWebhookEvent({
        provider: "cashfree",
        eventId: "cf_pay_dup_999",
        eventType: "PAYMENT_SUCCESS_WEBHOOK",
        signature: validSig,
        payloadHash: "hash_123",
        payload: JSON.parse(rawPayload),
        processed: true,
      });

      const result = await processCashfreeWebhook({
        rawBody: rawPayload,
        signatureHeader: validSig,
        timestampHeader: currentTimestamp,
      });

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain("Idempotent replay");
    });
  });

  // =========================================================================
  // 5. State Machine & Idempotency Invariants
  // =========================================================================
  describe("Phase 2E: State Machine & Idempotency Invariants", () => {
    it("ensures repeated verification does not allow illegal state jumps on already-paid orders", () => {
      expect(isValidOrderPaymentTransition("paid", "paid")).toBe(true); // Idempotent no-op
      expect(isValidOrderPaymentTransition("paid", "refunded")).toBe(true);
      expect(isValidOrderPaymentTransition("cancelled", "paid")).toBe(false); // Cancelled cannot become paid
      expect(isValidOrderPaymentTransition("refunded", "paid")).toBe(false); // Refunded cannot become paid
    });

    it("ensures payment state machine prevents captured payment from transitioning to pending", () => {
      expect(isValidPaymentTransition("captured", "pending")).toBe(false);
      expect(isValidPaymentTransition("captured", "captured")).toBe(true); // Idempotent no-op
      expect(isValidPaymentTransition("failed", "cancelled")).toBe(false);
    });
  });

  // =========================================================================
  // 6. Security & Credential Boundary Checks
  // =========================================================================
  describe("Phase 2F: Security & Zero Secret Exposure", () => {
    it("guarantees public payment configuration never exposes secret credentials", () => {
      const publicConfig = getPublicPaymentConfig();
      expect(publicConfig).toHaveProperty("keyId");
      expect(publicConfig).toHaveProperty("currency");
      expect(publicConfig).toHaveProperty("provider");
      expect(publicConfig).toHaveProperty("mode");

      // Verify zero secret leakage
      const configJson = JSON.stringify(publicConfig);
      expect(configJson).not.toContain("secretKey");
      expect(configJson).not.toContain("webhookSecret");
      expect(configJson).not.toContain("serviceRoleKey");
      expect(configJson).not.toContain("token");
    });

    it("guarantees no NEXT_PUBLIC_* variable contains secret keys", () => {
      const publicEnvKeys = Object.keys(process.env).filter((k) =>
        k.startsWith("NEXT_PUBLIC_")
      );

      for (const key of publicEnvKeys) {
        const upper = key.toUpperCase();
        expect(upper).not.toContain("SECRET");
        expect(upper).not.toContain("PRIVATE");
        expect(upper).not.toContain("SERVICE_ROLE");
        expect(upper).not.toContain("ACCESS_TOKEN");
      }
    });

    it("blocks access to server secret helper when called in browser environment", () => {
      // Simulate browser window
      (globalThis as any).window = {};
      try {
        expect(() => getServerCashfreeSecrets()).toThrow(
          /Payment secrets must NEVER be accessed in client bundles/
        );
      } finally {
        delete (globalThis as any).window;
      }
    });
  });
});
