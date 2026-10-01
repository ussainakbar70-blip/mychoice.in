import { NextRequest, NextResponse } from "next/server";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`admin_pay_list_${clientIp}`, 60, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const status = searchParams.get("status") || "all";

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        let query = supabase
          .from("payments")
          .select("*, orders(order_number, email, total_amount, order_status, fulfillment_status)")
          .order("created_at", { ascending: false });

        if (status !== "all") {
          query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (!error && data) {
          let list = data.map((p: any) => ({
            id: p.id,
            orderId: p.order_id,
            orderNumber: p.orders?.order_number || "N/A",
            provider: p.provider,
            providerOrderId: p.provider_order_id,
            providerPaymentId: p.provider_payment_id,
            amount: Number(p.amount),
            currency: p.currency,
            status: p.status,
            method: p.method,
            email: p.email || p.orders?.email,
            contact: p.contact,
            refundStatus: p.refund_status || "none",
            refundAmount: Number(p.refund_amount || 0),
            paidAt: p.paid_at,
            createdAt: p.created_at,
            orderStatus: p.orders?.order_status,
            fulfillmentStatus: p.orders?.fulfillment_status,
          }));

          if (search) {
            list = list.filter(
              (p: any) =>
                p.orderNumber.toLowerCase().includes(search) ||
                p.email?.toLowerCase().includes(search) ||
                p.providerPaymentId?.toLowerCase().includes(search) ||
                p.providerOrderId?.toLowerCase().includes(search)
            );
          }

          return NextResponse.json({ success: true, payments: list });
        }
      } catch {
        // Fallback to local store
      }
    }

    // Local fallback
    let list = dbStore.getAllPayments().map((p) => {
      const ord = dbStore.getOrder(p.orderId);
      return {
        id: p.id,
        orderId: p.orderId,
        orderNumber: ord?.orderNumber || "N/A",
        provider: p.provider,
        providerOrderId: p.providerOrderId,
        providerPaymentId: p.providerPaymentId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        email: p.email || ord?.email,
        contact: p.contact,
        refundStatus: p.refundStatus,
        refundAmount: p.refundAmount,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        orderStatus: ord?.orderStatus,
        fulfillmentStatus: ord?.fulfillmentStatus,
      };
    });

    if (status !== "all") {
      list = list.filter((p) => p.status === status);
    }

    if (search) {
      list = list.filter(
        (p) =>
          p.orderNumber.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search) ||
          p.providerPaymentId?.toLowerCase().includes(search) ||
          p.providerOrderId?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, payments: list });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
