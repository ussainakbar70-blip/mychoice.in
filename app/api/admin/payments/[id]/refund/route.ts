import { NextRequest, NextResponse } from "next/server";
import { processPaymentRefund } from "@/lib/payments/refunds";
import { formatSafePaymentErrorMessage } from "@/lib/payments/errors";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/security/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.id;

    // Rate Limiting (20 refund requests/min per IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`admin_refund_${clientIp}`, 20, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many refund requests." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const reason = body.reason || "Customer refund request";

    if (!amount || amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { error: "A valid positive refund amount is required." },
        { status: 400 }
      );
    }

    logger.info("Admin initiated refund", { paymentId, amount, reason });

    const result = await processPaymentRefund({
      paymentId,
      amount,
      reason,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error("Admin refund processing error", err);
    const safeMsg = formatSafePaymentErrorMessage(err);
    return NextResponse.json({ error: safeMsg }, { status: 400 });
  }
}
