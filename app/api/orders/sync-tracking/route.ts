import { NextRequest, NextResponse } from "next/server";
import { syncOrderTracking } from "@/lib/cj/orders";
import { logger } from "@/lib/security/logger";

/**
 * Endpoint to sync real-time tracking from CJ Dropshipping API for an order.
 * Updates order fulfillment status, records waybill code, and notifies customer.
 * POST /api/orders/sync-tracking
 * Body: { orderNumber: string } or { orderId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderRef = body.orderNumber || body.orderId;

    if (!orderRef) {
      return NextResponse.json(
        { error: "orderNumber or orderId is required." },
        { status: 400 }
      );
    }

    const result = await syncOrderTracking(orderRef);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    logger.info("Order tracking synchronized from CJ Dropshipping", {
      orderNumber: result.orderNumber,
      trackingNumber: result.trackingNumber,
      carrier: result.carrier,
      status: result.fulfillmentStatus,
      customerNotified: result.customerNotified,
    });

    return NextResponse.json({
      success: true,
      orderNumber: result.orderNumber,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
      carrier: result.carrier,
      fulfillmentStatus: result.fulfillmentStatus,
      customerNotified: result.customerNotified,
      message: result.message,
    });
  } catch (err: unknown) {
    logger.error("Order tracking sync exception", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tracking sync error" },
      { status: 500 }
    );
  }
}
