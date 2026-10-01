import { getPaymentProvider } from "./provider";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { fulfillLocalOrder } from "@/lib/cj/orders";
import { PaymentReconciliationResult, PaymentStatus } from "./types";
import { isValidPaymentTransition } from "./state-machine";

/**
 * Reconciles state between local payment records and upstream gateway (Razorpay).
 * Solves:
 * - Browser closed before verification
 * - Delayed or dropped webhooks
 * - Intermittent network timeouts
 */
export async function reconcilePayment(paymentId: string): Promise<PaymentReconciliationResult> {
  const provider = getPaymentProvider();

  // 1. Fetch Local Payment Record
  let payment: any = null;
  let order: any = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("payments")
        .select("*, orders(*)")
        .eq("id", paymentId)
        .single();

      if (!error && data) {
        payment = data;
        order = data.orders;
      }
    } catch {
      // Fallback
    }
  }

  if (!payment) {
    payment = dbStore.getPayment(paymentId);
    if (payment) {
      order = dbStore.getOrder(payment.orderId);
    }
  }

  if (!payment) {
    return {
      orderId: "",
      orderNumber: "",
      provider: provider.name,
      providerStatus: "unknown",
      localStatus: "not_found",
      isDiscrepancy: true,
      message: `Payment record "${paymentId}" not found in database.`,
    };
  }

  const orderId = payment.order_id || payment.orderId;
  const orderNumber = order?.order_number || order?.orderNumber || "UNKNOWN";
  const localStatus = payment.status;
  const providerPaymentId =
    payment.provider_payment_id ||
    payment.providerPaymentId ||
    payment.provider_order_id ||
    payment.providerOrderId;

  if (!providerPaymentId) {
    return {
      orderId,
      orderNumber,
      provider: provider.name,
      providerStatus: "none",
      localStatus,
      isDiscrepancy: false,
      message: "Payment has not received a gateway payment transaction ID yet.",
    };
  }

  // 2. Fetch Gateway Record
  const gatewayDetails = await provider.fetchPayment(providerPaymentId);
  if (!gatewayDetails) {
    return {
      orderId,
      orderNumber,
      provider: provider.name,
      providerStatus: "not_found_at_gateway",
      localStatus,
      isDiscrepancy: true,
      message: "Transaction ID was not found at the upstream payment provider.",
    };
  }

  const providerStatus = gatewayDetails.status;
  const isDiscrepancy = localStatus !== providerStatus;

  if (!isDiscrepancy) {
    return {
      orderId,
      orderNumber,
      provider: provider.name,
      providerStatus,
      localStatus,
      isDiscrepancy: false,
      message: "Gateway and local database states are completely synchronized.",
    };
  }

  // 3. Resolve Discrepancy Safely
  let resolutionApplied = "";
  const now = new Date().toISOString();

  if (providerStatus === "captured" && (localStatus === "pending" || localStatus === "created" || localStatus === "failed")) {
    if (isValidPaymentTransition(localStatus as PaymentStatus, "captured")) {
      dbStore.updatePayment(payment.id, {
        status: "captured",
        paidAt: now,
        capturedAt: now,
      });

      if (order && order.paymentStatus !== "paid") {
        dbStore.updateOrder(order.id, {
          paymentStatus: "paid",
          orderStatus: "confirmed",
        });
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseServerClient();
          await supabase
            .from("payments")
            .update({
              status: "captured",
              paid_at: now,
              captured_at: now,
              updated_at: now,
            })
            .eq("id", payment.id);

          await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              order_status: "confirmed",
              updated_at: now,
            })
            .eq("id", orderId);
        } catch {
          // Fallback
        }
      }

      // Trigger CJ fulfillment if needed
      try {
        await fulfillLocalOrder(orderId, { allowTestMode: true });
      } catch (err) {
        console.warn("[Reconciliation] CJ fulfillment trigger fallback:", err);
      }

      resolutionApplied = "Upgraded local status to 'captured' and confirmed order fulfillment.";
    }
  } else if (providerStatus === "failed" && localStatus === "pending") {
    dbStore.updatePayment(payment.id, { status: "failed" });
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        await supabase
          .from("payments")
          .update({ status: "failed", updated_at: now })
          .eq("id", payment.id);
      } catch {
        // Fallback
      }
    }
    resolutionApplied = "Marked local payment as failed to reflect gateway rejection.";
  }

  return {
    orderId,
    orderNumber,
    provider: provider.name,
    providerStatus,
    localStatus,
    isDiscrepancy: true,
    resolutionApplied,
    message: resolutionApplied
      ? `Discrepancy resolved: ${resolutionApplied}`
      : `Discrepancy detected (Provider: ${providerStatus}, Local: ${localStatus}), manual review required.`,
  };
}
