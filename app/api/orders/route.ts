import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("order_number")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!orderNumber) {
      return NextResponse.json({ error: "order_number is required" }, { status: 400 });
    }

    const order = dbStore.getOrderByNumber(orderNumber) || dbStore.getOrderById(orderNumber);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Optional email confirmation security check if email was supplied
    if (email && order.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Order details do not match email." }, { status: 403 });
    }

    // Determine visual timeline stages
    const stages = [
      { key: "placed", label: "Order Placed", completed: true, timestamp: order.createdAt },
      { key: "payment", label: "Payment Confirmed", completed: order.paymentStatus === "paid", timestamp: order.createdAt },
      { key: "processing", label: "Processing & QC", completed: ["confirmed", "processing", "completed"].includes(order.orderStatus) },
      { key: "fulfillment", label: "Dispatched to Carrier", completed: ["submitted_to_cj", "cj_processing", "shipped", "delivered"].includes(order.fulfillmentStatus) },
      { key: "in_transit", label: "In Transit", completed: ["shipped", "delivered"].includes(order.fulfillmentStatus) },
      { key: "delivered", label: "Delivered", completed: order.fulfillmentStatus === "delivered" },
    ];

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        subtotal: order.subtotal,
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingAddress: order.shippingAddress,
        items: order.items,
        trackingNumber: order.trackingNumber || (order.cjOrderId ? `CJ${order.cjOrderId.substring(0, 10)}` : undefined),
        trackingUrl: order.trackingUrl || (order.trackingNumber ? `https://www.17track.net/en/track?nums=${order.trackingNumber}` : undefined),
        createdAt: order.createdAt,
      },
      stages,
    });
  } catch (error) {
    console.error("Order lookup error:", error);
    return NextResponse.json({ error: "Failed to query order." }, { status: 500 });
  }
}
