import { NextRequest, NextResponse } from "next/server";
import { verifyCJWebhookSignature, cjWebhookDispatcher } from "@/lib/cj";
import { dbStore } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("sign") || req.headers.get("x-cj-signature");

    // 1. Verify HMAC-SHA256 signature
    const isValid = verifyCJWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn("Unauthorized webhook request rejected: Invalid signature.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // 2. Enforce Idempotency Guard (Never process same event ID twice)
    const result = cjWebhookDispatcher.processEvent(payload);
    if (result.duplicate) {
      return NextResponse.json({
        received: true,
        status: "duplicate_ignored",
        message: "Event was already processed idempotently.",
      });
    }

    // 3. Process event data on real database records
    const eventData = payload.data || {};
    const orderNumber = eventData.orderNumber;
    const cjOrderId = eventData.orderId;

    if (orderNumber) {
      const order = dbStore.getOrderByNumber(orderNumber);
      if (order) {
        if (eventData.orderStatus) {
          dbStore.updateOrder(order.id, {
            fulfillmentStatus:
              eventData.orderStatus === "SHIPPED"
                ? "shipped"
                : eventData.orderStatus === "DELIVERED"
                ? "delivered"
                : "cj_processing",
          });
        }
        if (eventData.trackingNumber) {
          dbStore.updateOrder(order.id, {
            trackingNumber: eventData.trackingNumber,
            trackingUrl:
              eventData.trackingUrl ||
              `https://www.17track.net/en/track?nums=${eventData.trackingNumber}`,
            fulfillmentStatus: "shipped",
          });
        }
      }
    }

    return NextResponse.json({
      received: true,
      status: "processed",
      action: result.action,
    });
  } catch (err: unknown) {
    console.error("CJ Webhook processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 }
    );
  }
}
