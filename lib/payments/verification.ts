import crypto from "crypto";

/**
 * Cryptographic Signature Verification for Razorpay Payments & Webhooks
 * 
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attack vulnerabilities.
 */

/**
 * Verifies the signature returned by Razorpay Checkout in the browser.
 * Formula: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyRazorpayPaymentSignature(
  providerOrderId: string,
  providerPaymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!providerOrderId || !providerPaymentId || !signature || !secret) {
    return false;
  }

  try {
    const payload = `${providerOrderId}|${providerPaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(generatedSignature, "utf-8");
    const receivedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature against raw HTTP request payload.
 * Header: 'x-razorpay-signature'
 * Formula: HMAC-SHA256(raw_body, webhook_secret)
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(generatedSignature, "utf-8");
    const receivedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verifies Cashfree Webhook signature against raw HTTP request payload.
 * Headers: 'x-webhook-signature' and 'x-webhook-timestamp'
 * Formula: HMAC-SHA256(timestamp + rawBody, secret) encoded in Base64
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  secret: string
): boolean {
  if (!rawBody || !timestamp || !signature || !secret) {
    return false;
  }

  try {
    const signedPayload = `${timestamp}${rawBody}`;
    const generatedBase64 = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("base64");

    const expectedBuffer = Buffer.from(generatedBase64, "utf-8");
    const receivedBuffer = Buffer.from(signature, "utf-8");

    if (
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return true;
    }

    // Fallback: check hex encoding if merchant configured hex format
    const generatedHex = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");
    const expectedHexBuffer = Buffer.from(generatedHex, "utf-8");

    if (
      expectedHexBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedHexBuffer, receivedBuffer)
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

