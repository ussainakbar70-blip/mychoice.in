import { NextRequest, NextResponse } from "next/server";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (60 req/min)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`admin_orders_${clientIp}`, 60, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const orderStatus = searchParams.get("orderStatus") || searchParams.get("order_status") || "all";
    const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("payment_status") || "all";
    const fulfillmentStatus = searchParams.get("fulfillmentStatus") || searchParams.get("fulfillment_status") || "all";

    // 2. Fetch from Supabase PostgreSQL if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        let query = supabase
          .from("orders")
          .select("*, order_items(*)", { count: "exact" });

        // Apply Status Filters
        if (orderStatus !== "all") {
          query = query.eq("order_status", orderStatus);
        }
        if (paymentStatus !== "all") {
          query = query.eq("payment_status", paymentStatus);
        }
        if (fulfillmentStatus !== "all") {
          query = query.eq("fulfillment_status", fulfillmentStatus);
        }

        // Apply Search Filter
        if (search) {
          const term = `%${search}%`;
          query = query.or(
            `order_number.ilike.${term},email.ilike.${term},phone.ilike.${term},customer_name.ilike.${term},tracking_number.ilike.${term},cj_order_id.ilike.${term}`
          );
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data, count, error } = await query;

        if (!error && data) {
          const formattedOrders = data.map((o: any) => {
            const addr =
              o.shipping_address ||
              (typeof o.notes === "object" ? o.notes?.shippingAddress : null) ||
              (typeof o.notes === "string" ? (() => { try { return JSON.parse(o.notes)?.shippingAddress; } catch { return null; } })() : null) ||
              {
                fullName: o.customer_name || "Customer",
                phone: o.phone || "",
                addressLine1: "",
                city: "",
                state: "",
                postalCode: "",
                country: "",
                countryCode: "",
              };

            return {
              id: o.id,
              orderNumber: o.order_number,
              customerId: o.customer_id,
              email: o.email,
              currency: o.currency || "INR",
              subtotal: Number(o.subtotal || 0),
              shippingAmount: Number(o.shipping_amount || 0),
              discountAmount: Number(o.discount_amount || 0),
              taxAmount: Number(o.tax_amount || 0),
              totalAmount: Number(o.total_amount || 0),
              paymentStatus: o.payment_status,
              orderStatus: o.order_status,
              fulfillmentStatus: o.fulfillment_status,
              shippingAddress: addr,
              cjOrderId: o.cj_order_id,
              trackingNumber: o.tracking_number,
              trackingUrl: o.tracking_url,
              internalNotes: o.internal_notes,
              createdAt: o.created_at,
              updatedAt: o.updated_at,
              items: (o.order_items || []).map((i: any) => ({
                id: i.id,
                productId: i.product_id,
                variantId: i.variant_id,
                productName: i.product_name,
                variantName: i.variant_name,
                sku: i.sku,
                quantity: i.quantity,
                unitPrice: Number(i.unit_price),
                totalPrice: Number(i.total_price),
                cjProductId: i.cj_product_id,
                cjVariantId: i.cj_variant_id,
              })),
            };
          });

          return NextResponse.json({
            success: true,
            orders: formattedOrders,
            total: count ?? formattedOrders.length,
            page,
            limit,
            totalPages: Math.ceil((count ?? formattedOrders.length) / limit),
          });
        }
      } catch (dbErr) {
        console.warn("[Admin Orders API] Supabase query fallback to local store:", dbErr);
      }
    }

    // 3. Fallback to server dbStore for offline/dev testing
    let localList = dbStore.getAllOrders().map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerId: null,
      email: o.email,
      currency: o.currency || "INR",
      subtotal: o.subtotal,
      shippingAmount: o.shippingAmount,
      discountAmount: o.discountAmount,
      taxAmount: o.taxAmount,
      totalAmount: o.totalAmount,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      shippingAddress: o.shippingAddress,
      cjOrderId: o.cjOrderId,
      trackingNumber: o.trackingNumber,
      trackingUrl: o.trackingUrl,
      internalNotes: null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items.map((i, idx) => ({
        id: `item_${o.id}_${idx}`,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        cjProductId: i.cjProductId,
        cjVariantId: i.cjVariantId,
      })),
    }));

    if (orderStatus !== "all") {
      localList = localList.filter((o) => o.orderStatus === orderStatus);
    }
    if (paymentStatus !== "all") {
      localList = localList.filter((o) => o.paymentStatus === paymentStatus);
    }
    if (fulfillmentStatus !== "all") {
      localList = localList.filter((o) => o.fulfillmentStatus === fulfillmentStatus);
    }
    if (search) {
      localList = localList.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(search) ||
          (o.email ? o.email.toLowerCase().includes(search) : false) ||
          (o.shippingAddress?.fullName ? o.shippingAddress.fullName.toLowerCase().includes(search) : false) ||
          (o.shippingAddress?.phone ? o.shippingAddress.phone.includes(search) : false) ||
          (o.trackingNumber ? o.trackingNumber.toLowerCase().includes(search) : false) ||
          (o.cjOrderId ? o.cjOrderId.toLowerCase().includes(search) : false)
      );
    }

    const total = localList.length;
    const startIndex = (page - 1) * limit;
    const paginated = localList.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      orders: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch admin orders" },
      { status: 500 }
    );
  }
}
