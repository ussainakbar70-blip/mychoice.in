import { NextRequest, NextResponse } from "next/server";
import { CheckoutRequestSchema } from "@/lib/validation/schemas";
import { createCheckoutPaymentOrder } from "@/lib/payments/orders";
import { formatSafePaymentErrorMessage } from "@/lib/payments/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/security/logger";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Protection (15 requests/min per IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`pay_create_${clientIp}`, 15, 60000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many payment requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const rawBody = await req.json();

    // 2. Strict Zod Schema Validation
    const parsed = CheckoutRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid checkout request data.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 3. Create Server-Authoritative Payment Order
    const result = await createCheckoutPaymentOrder(parsed.data);

    logger.info("Payment order initiated successfully", {
      orderNumber: result.orderNumber,
      provider: result.checkout.provider,
      amount: result.checkout.amount,
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      paymentId: result.paymentId,
      checkout: result.checkout,
      isIdempotentReplay: result.isIdempotentReplay,
    });
  } catch (err: unknown) {
    logger.error("Payment order creation failed", err);
    const safeMessage = formatSafePaymentErrorMessage(err);
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
