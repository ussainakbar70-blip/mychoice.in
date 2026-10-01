import { NextRequest, NextResponse } from "next/server";
import { reconcilePayment } from "@/lib/payments/reconciliation";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/security/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.id;

    // Rate limit
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const rl = await checkRateLimit(`admin_reconcile_${clientIp}`, 30, 60000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many reconciliation requests." }, { status: 429 });
    }

    logger.info("Admin initiated payment reconciliation", { paymentId });

    const result = await reconcilePayment(paymentId);

    return NextResponse.json({
      success: true,
      reconciliation: result,
    });
  } catch (err: unknown) {
    logger.error("Payment reconciliation error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reconciliation failed" },
      { status: 500 }
    );
  }
}
