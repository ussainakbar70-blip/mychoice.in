import { NextRequest, NextResponse } from "next/server";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("order_number")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!orderNumber) {
      return NextResponse.json({ error: "order_number is required" }, { status: 400 });
    }

    let order: any = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderNumber);
        let query = supabase.from("orders").select("*, order_items(*)");
        if (isUuid) {
          query = query.eq("id", orderNumber);
        } else {
          query = query.eq("order_number", orderNumber);
        }

        const { data } = await query.single();
        if (data) {
          const addr =
            data.shipping_address ||
            (typeof data.notes === "object" ? data.notes?.shippingAddress : null) ||
            (typeof data.notes === "string" ? (() => { try { return JSON.parse(data.notes)?.shippingAddress; } catch { return null; } })() : null);

          order = {
            id: data.id,
            orderNumber: data.order_number,
            email: data.email,
            currency: data.currency,
            subtotal: Number(data.subtotal),
            shippingAmount: Number(data.shipping_amount),
            discountAmount: Number(data.discount_amount),
            taxAmount: Number(data.tax_amount || 0),
            totalAmount: Number(data.total_amount),
            orderStatus: data.order_status,
            paymentStatus: data.payment_status,
            fulfillmentStatus: data.fulfillment_status,
            shippingAddress: addr,
            cjOrderId: data.cj_order_id,
            trackingNumber: data.tracking_number,
            trackingUrl: data.tracking_url,
            items: (data.order_items || []).map((i: any) => ({
              id: i.id,
              productId: i.product_id,
              variantId: i.variant_id,
              productName: i.product_name,
              variantName: i.variant_name,
              sku: i.sku,
              quantity: i.quantity,
              unitPrice: Number(i.unit_price),
              totalPrice: Number(i.total_price),
            })),
            createdAt: data.created_at,
          };
        }
      } catch {
        // Fallback to local store
      }
    }

    if (!order) {
      const local = dbStore.getOrderByNumber(orderNumber) || dbStore.getOrderById(orderNumber);
      if (local) {
        order = {
          id: local.id,
          orderNumber: local.orderNumber,
          email: local.email,
          currency: local.currency,
          subtotal: local.subtotal,
          shippingAmount: local.shippingAmount,
          discountAmount: local.discountAmount,
          totalAmount: local.totalAmount,
          orderStatus: local.orderStatus,
          paymentStatus: local.paymentStatus,
          fulfillmentStatus: local.fulfillmentStatus,
          shippingAddress: local.shippingAddress,
          cjOrderId: local.cjOrderId,
          items: local.items,
          trackingNumber: local.trackingNumber,
          trackingUrl: local.trackingUrl,
          createdAt: local.createdAt,
        };
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isVerified = Boolean(email && order.email && order.email.toLowerCase() === email.toLowerCase());

    // Optional email confirmation security check if email was supplied
    if (email && order.email && !isVerified) {
      return NextResponse.json({ error: "Order reference does not match the provided email address." }, { status: 403 });
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

    const rawAddr = order.shippingAddress || {};
    const safeShippingAddress = {
      fullName: rawAddr.fullName || "Valued Customer",
      addressLine1: isVerified ? rawAddr.addressLine1 : "•••••••• (Verify email to reveal street)",
      addressLine2: isVerified ? rawAddr.addressLine2 : undefined,
      city: rawAddr.city || "Destination City",
      state: rawAddr.state || "State",
      postalCode: isVerified ? rawAddr.postalCode : (rawAddr.postalCode ? `${String(rawAddr.postalCode).slice(0, 2)}•••` : ""),
      country: rawAddr.country || "Destination Country",
      countryCode: rawAddr.countryCode || "IN",
    };

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: isVerified ? order.email : (order.email ? `${order.email.slice(0, 2)}•••@•••` : undefined),
        subtotal: order.subtotal,
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        shippingAddress: safeShippingAddress,
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
