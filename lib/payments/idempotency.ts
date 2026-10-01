import crypto from "crypto";

/**
 * Payment and Webhook Idempotency Utilities
 */

/**
 * Generates a standard idempotency key for checkout attempts.
 */
export function generatePaymentIdempotencyKey(seed?: string): string {
  const random = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  if (seed) {
    const cleanSeed = seed.replace(/[^a-zA-Z0-9_-]/g, "");
    return `idem_${cleanSeed}_${timestamp}_${random}`;
  }
  return `idem_${timestamp}_${random}`;
}

/**
 * Validates format of an incoming client idempotency key.
 */
export function isValidIdempotencyKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== "string") return false;
  return key.length >= 8 && key.length <= 128 && /^[a-zA-Z0-9_.-]+$/.test(key);
}
