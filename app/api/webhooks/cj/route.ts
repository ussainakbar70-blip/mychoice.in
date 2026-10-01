import { NextRequest, NextResponse } from "next/server";
import { verifyCJWebhookSignature, cjWebhookDispatcher } from "@/lib/cj";

/**
 * CJ Dropshipping Webhook Receiver Endpoint
 * Official API 2.0 Specifications:
 * - Method: POST (HTTPS)
 * - Signature Header: 'sign' (or 'x-cj-signature')
 * - Secret: openId (or CJ_OPEN_ID / CJ_WEBHOOK_SECRET)
 * - Algorithm: HMAC-SHA256 Base64 on raw body bytes
 * - SLA: Must respond with HTTP 200 within approximately 3 seconds
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("sign") || req.headers.get("x-cj-signature");

    // 1. Verify HMAC-SHA256 Base64 signature on raw bytes
    const isValid = verifyCJWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn("[CJ Webhook] Unauthorized request rejected: Invalid HMAC-SHA256 signature.");
      return NextResponse.json(
        { code: 401, result: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { code: 400, result: false, message: "Malformed JSON payload" },
        { status: 400 }
      );
    }

    // 2. Validate essential envelope fields
    if (!payload.messageType && !payload.messageId) {
      return NextResponse.json(
        { code: 400, result: false, message: "Missing required webhook envelope fields" },
        { status: 400 }
      );
    }

    // 3. Process event safely & idempotently
    try {
      await cjWebhookDispatcher.processEvent(payload);
    } catch (err: unknown) {
      console.error("[CJ Webhook] Processing error:", err);
    }

    return NextResponse.json({
      code: 200,
      result: true,
      message: "success",
    });
  } catch (err: unknown) {
    console.error("[CJ Webhook] Ingestion error:", err);
    return NextResponse.json(
      { code: 500, result: false, message: "Webhook ingestion failure" },
      { status: 500 }
    );
  }
}
