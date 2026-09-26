import crypto from "crypto";
import { CJWebhookPayload } from "./types";

/**
 * Verifies CJdropshipping webhook signature.
 * CJ signs the raw JSON body using HMAC-SHA256 with the merchant's secret/openId.
 */
export function verifyCJWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secretKey?: string
): boolean {
  const secret = secretKey || process.env.CJ_WEBHOOK_SECRET || process.env.CJ_API_KEY;
  if (!secret) {
    // If no secret configured in development, do not crash but flag warning
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, "utf8"),
      Buffer.from(signatureHeader, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Webhook handler with idempotency guard.
 */
export class CJWebhookDispatcher {
  private processedEventIds = new Set<string>();

  /**
   * Returns true if event was newly processed, or false if already processed (duplicate).
   */
  processEvent(payload: CJWebhookPayload): { duplicate: boolean; handled: boolean; action?: string } {
    const eventId = payload.messageId || `evt_${payload.sendTime}_${payload.messageType}`;

    if (this.processedEventIds.has(eventId)) {
      return { duplicate: true, handled: false };
    }

    this.processedEventIds.add(eventId);

    // Limit memory set size to prevent leak
    if (this.processedEventIds.size > 10000) {
      const firstEntries = Array.from(this.processedEventIds).slice(0, 1000);
      for (const id of firstEntries) {
        this.processedEventIds.delete(id);
      }
    }

    let action = "unhandled";
    switch (payload.messageType) {
      case "ORDER_STATUS_UPDATE":
        action = "order_status_updated";
        break;
      case "SHIPPING_TRACKING_UPDATE":
        action = "tracking_updated";
        break;
      case "INVENTORY_CHANGE":
        action = "inventory_synchronized";
        break;
      default:
        action = `received_${payload.messageType.toLowerCase()}`;
    }

    return { duplicate: false, handled: true, action };
  }
}

export const cjWebhookDispatcher = new CJWebhookDispatcher();
