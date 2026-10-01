import { NextRequest, NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/lib/payments/webhooks";
import { logger } from "@/lib/security/logger";

/**
 * Razorpay Webhook Ingestion Route
 * 
 * Official Specifications:
 * - Method: POST (HTTPS)
 * - Signature Header: 'x-razorpay-signature'
 * - Raw Payload: Must verify HMAC-SHA256 signature against exact raw bytes
 * - Idempotent event processing via payment_webhook_events
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      logger.warn("[Razorpay Webhook] Rejected: Missing signature header");
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const result = await processRazorpayWebhook(rawBody, signature);

    if (!result.success && !result.isDuplicate) {
      if (result.message.includes("Invalid webhook signature")) {
        logger.security("RAZORPAY_WEBHOOK_INVALID_SIGNATURE", {
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
    logger.error("[Razorpay Webhook] Uncaught ingestion error", err);
    return NextResponse.json(
      { error: "Webhook ingestion failure" },
      { status: 500 }
    );
  }
}
