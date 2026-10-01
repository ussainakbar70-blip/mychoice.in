import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { fulfillLocalOrder } from "@/lib/cj/orders";
import { emailService } from "@/lib/email";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/security/logger";
import { formatSafePaymentErrorMessage, PaymentVerificationError } from "@/lib/payments/errors";
import { isValidOrderPaymentTransition, isValidPaymentTransition } from "@/lib/payments/state-machine";
import { PaymentStatus } from "@/lib/payments/types";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (20 verification attempts/min per IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`pay_verify_${clientIp}`, 20, 60000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { orderId, providerOrderId, providerPaymentId, providerSignature } = body;

    if (!orderId || (!providerOrderId && !providerPaymentId)) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    // 2. Fetch Order & Linked Payment Record
    let order: any = null;
    let payment: any = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        let query = supabase.from("orders").select("*, order_items(*)");
        if (isUuid) {
          query = query.eq("id", orderId);
        } else {
          query = query.eq("order_number", orderId);
        }

        const { data: dbOrder } = await query.single();
        if (dbOrder) {
          order = dbOrder;
          const { data: dbPay } = await supabase
            .from("payments")
            .select("*")
            .eq("order_id", dbOrder.id)
            .single();
          if (dbPay) payment = dbPay;
        }

        // Secondary fallback: lookup by providerOrderId if needed
        if (!order && providerOrderId) {
          const { data: payRow } = await supabase
            .from("payments")
            .select("order_id")
            .eq("provider_order_id", providerOrderId)
            .single();
          if (payRow?.order_id) {
            const { data: ordRow } = await supabase
              .from("orders")
              .select("*, order_items(*)")
              .eq("id", payRow.order_id)
              .single();
            if (ordRow) {
              order = ordRow;
              const { data: payFull } = await supabase
                .from("payments")
                .select("*")
                .eq("order_id", ordRow.id)
                .single();
              if (payFull) payment = payFull;
            }
          }
        }
      } catch (dbErr) {
        console.warn("[Payments Verify] Supabase lookup error:", dbErr);
      }
    }

    if (!order) {
      order = dbStore.getOrder(orderId) || (providerOrderId ? dbStore.getPaymentByProviderOrderId(providerOrderId)?.orderId ? dbStore.getOrder(dbStore.getPaymentByProviderOrderId(providerOrderId)!.orderId) : null : null);
      if (order) {
        payment = dbStore.getPaymentByOrderId(order.id);
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Associated order could not be located." },
        { status: 404 }
      );
    }

    const currentPaymentStatus = order.payment_status || order.paymentStatus || "pending";
    const currentOrderStatus = order.order_status || order.orderStatus || "pending";
    const orderNumber = order.order_number || order.orderNumber;

    // Idempotency: If already verified and paid, return success immediately
    if (currentPaymentStatus === "paid" || currentOrderStatus === "confirmed" || currentOrderStatus === "completed") {
      return NextResponse.json({
        success: true,
        orderNumber,
        isAlreadyVerified: true,
        redirectUrl: `/checkout/success?order_number=${orderNumber}`,
      });
    }

    // Assert order eligibility for payment transition
    if (!isValidOrderPaymentTransition(currentPaymentStatus, "paid")) {
      return NextResponse.json(
        { error: `Order is in '${currentPaymentStatus}' state and is not eligible for payment.` },
        { status: 400 }
      );
    }

    // Assert payment record eligibility if present
    if (payment) {
      if (payment.status === "captured") {
        return NextResponse.json({
          success: true,
          orderNumber,
          isAlreadyVerified: true,
          redirectUrl: `/checkout/success?order_number=${orderNumber}`,
        });
      }
      if (!isValidPaymentTransition(payment.status as PaymentStatus, "captured")) {
        return NextResponse.json(
          { error: `Payment record is in '${payment.status}' state and cannot transition to captured.` },
          { status: 400 }
        );
      }
    }

    // 3. Cryptographic Signature & Server-Side Verification
    const provider = getPaymentProvider();
    const expectedAmount = Number(order.total_amount ?? order.totalAmount);
    const expectedCurrency = order.currency || "INR";

    const verificationResult = await provider.verifyPayment({
      orderId,
      providerOrderId: providerOrderId || orderId,
      providerPaymentId: providerPaymentId || providerOrderId || orderId,
      providerSignature: providerSignature || "cf_api_verified",
      expectedAmount,
      expectedCurrency,
    });


    if (!verificationResult.verified) {
      logger.security("PAYMENT_SIGNATURE_VERIFICATION_FAILED", {
        orderId,
        providerOrderId,
        providerPaymentId,
      });
      return NextResponse.json(
        { error: "Payment verification failed. Invalid cryptographic signature." },
        { status: 400 }
      );
    }

    // 4. Update Database: Mark Payment CAPTURED and Order PAID
    const now = new Date().toISOString();

    if (payment) {
      dbStore.updatePayment(payment.id, {
        providerPaymentId,
        providerSignature,
        status: "captured",
        method: verificationResult.method || "online",
        paidAt: now,
        capturedAt: now,
      });
    }

    dbStore.updateOrder(orderId, {
      paymentStatus: "paid",
      orderStatus: "confirmed",
    });

    // Safely deduct catalog inventory in local store
    const items = order.order_items || order.items || [];
    for (const item of items) {
      const pId = item.product_id || item.productId;
      const vId = item.variant_id || item.variantId;
      const qty = item.quantity || 1;
      const prod = DEMO_PRODUCTS.find((p) => p.id === pId);
      const variant = prod?.variants.find((v) => v.id === vId);
      if (variant) {
        variant.inventoryQuantity = Math.max(0, variant.inventoryQuantity - qty);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        await supabase
          .from("payments")
          .update({
            provider_payment_id: providerPaymentId,
            provider_signature: providerSignature,
            status: "captured",
            method: verificationResult.method || "online",
            paid_at: now,
            captured_at: now,
            updated_at: now,
          })
          .eq("order_id", order.id);

        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            order_status: "confirmed",
            updated_at: now,
          })
          .eq("id", order.id);
      } catch (dbErr) {
        console.warn("[Payments Verify] Supabase status update fallback:", dbErr);
      }
    }

    // 5. Trigger CJ Dropshipping Fulfillment Engine (Rule 16)
    try {
      await fulfillLocalOrder(order.id, { allowTestMode: true });
    } catch (cjErr) {
      console.warn("[Payments Verify] Post-payment CJ fulfillment error:", cjErr);
      // Payment remains PAID, fulfillment status is safely marked manual_review!
    }

    // 6. Dispatch Customer Confirmation Email (with idempotency check)
    try {
      const email = order.email;
      const shippingAddress = order.notes?.shippingAddress || order.shippingAddress;
      const customerName = shippingAddress?.fullName || "Valued Customer";

      if (email && !dbStore.hasNotificationEvent(orderId, "order_confirmed", providerPaymentId)) {
        dbStore.recordNotificationEvent({
          orderId,
          notificationType: "order_confirmed",
          eventReference: providerPaymentId,
          recipient: email,
          status: "sent",
        });

        await emailService.send({
          to: { email, name: customerName },
          subject: `Order Confirmed: ${orderNumber} | MYCHOICE.in`,
          template: "order_confirmation",
          data: {
            orderNumber,
            total: expectedAmount,
            customerName,
            shippingAddress,
            items,
          },
        });
      }
    } catch (emailErr) {
      console.warn("[Payments Verify] Confirmation email dispatch warning:", emailErr);
    }

    logger.info("Payment successfully verified and order confirmed", {
      orderNumber,
      providerPaymentId,
      amount: expectedAmount,
    });

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId,
      redirectUrl: `/checkout/success?order_number=${orderNumber}`,
    });
  } catch (err: unknown) {
    logger.error("Payment verification route exception", err);
    if (err instanceof PaymentVerificationError) {
      const msg = err.message;
      const isPending = msg.toLowerCase().includes("active") || msg.toLowerCase().includes("pending");
      return NextResponse.json(
        {
          success: false,
          status: isPending ? "pending" : "failed",
          error: msg,
        },
        { status: 400 }
      );
    }
    const safeMsg = formatSafePaymentErrorMessage(err);
    return NextResponse.json({ error: safeMsg }, { status: 400 });
  }
}
