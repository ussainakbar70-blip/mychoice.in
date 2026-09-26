import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyCJWebhookSignature, CJWebhookDispatcher } from "@/lib/cj/webhooks";
import { cjService } from "@/lib/cj";

describe("CJdropshipping Integration & Webhook Security", () => {
  const secretKey = "test_cj_webhook_secret_key";
  const samplePayload = JSON.stringify({
    messageType: "ORDER_STATUS_UPDATE",
    messageId: "msg_test_1001",
    sendTime: Date.now(),
    data: {
      orderId: "CJ_ORD_8899",
      orderNumber: "ORD-2026-10001",
      orderStatus: "SHIPPED",
    },
  });

  it("verifies valid HMAC-SHA256 signatures", () => {
    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(samplePayload, "utf8")
      .digest("hex");

    const verified = verifyCJWebhookSignature(samplePayload, validSignature, secretKey);
    expect(verified).toBe(true);
  });

  it("rejects tampered or invalid webhook signatures", () => {
    const fakeSignature = "invalid_signature_hex_1234567890abcdef";
    const verified = verifyCJWebhookSignature(samplePayload, fakeSignature, secretKey);
    expect(verified).toBe(false);
  });

  it("guarantees idempotency by discarding duplicate webhook message IDs", () => {
    const dispatcher = new CJWebhookDispatcher();
    const payloadObj = JSON.parse(samplePayload);

    // First attempt: should process
    const firstResult = dispatcher.processEvent(payloadObj);
    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.handled).toBe(true);

    // Second attempt with exact same message ID: must be flagged as duplicate
    const secondResult = dispatcher.processEvent(payloadObj);
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.handled).toBe(false);
  });

  it("queries CJ products via unified service layer", async () => {
    const res = await cjService.getProducts({ pageSize: 5 });
    expect(res.code).toBe(200);
    expect(res.data.list.length).toBeGreaterThan(0);
    expect(res.data.list[0]).toHaveProperty("pid");
  });
});
