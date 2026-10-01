import { NextRequest, NextResponse } from "next/server";
import { processCashfreeWebhook } from "@/lib/payments/webhooks";
import { logger } from "@/lib/security/logger";

/**
 * Cashfree Webhook Ingestion Route
 * 
 * Official Specifications:
 * - Method: POST (HTTPS)
 * - Signature Header: 'x-webhook-signature'
 * - Timestamp Header: 'x-webhook-timestamp'
 * - Raw Payload: HMAC-SHA256(timestamp + rawBody, secret) encoded in Base64
 * - Idempotent event processing via payment_webhook_events
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("X-Webhook-Signature");
    const timestamp =
      req.headers.get("x-webhook-timestamp") ||
      req.headers.get("X-Webhook-Timestamp");

    if (!signature) {
      logger.warn("[Cashfree Webhook] Rejected: Missing x-webhook-signature header");
      return NextResponse.json(
        { error: "Missing x-webhook-signature header" },
        { status: 400 }
      );
    }

    if (!timestamp) {
      logger.warn("[Cashfree Webhook] Rejected: Missing x-webhook-timestamp header");
      return NextResponse.json(
        { error: "Missing x-webhook-timestamp header" },
        { status: 400 }
      );
    }

    const result = await processCashfreeWebhook({
      rawBody,
      signatureHeader: signature,
      timestampHeader: timestamp,
    });

    if (!result.success && !result.isDuplicate) {
      if (result.message.includes("Invalid Cashfree webhook signature")) {
        logger.security("CASHFREE_WEBHOOK_INVALID_SIGNATURE", {
          eventId: result.eventId,
        });
        return NextResponse.json(
          { error: "Invalid cryptographic signature" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      received: true,
      eventId: result.eventId,
      isDuplicate: result.isDuplicate,
    });
  } catch (err: unknown) {
    logger.error("[Cashfree Webhook] Uncaught ingestion error", err);
    return NextResponse.json(
      { error: "Webhook ingestion failure" },
      { status: 500 }
    );
  }
}
