import { getPaymentProvider } from "./provider";
import { dbStore, getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { RefundRecord, PaymentStatus } from "./types";
import { PaymentRefundError } from "./errors";
import { addMoney, subtractMoney } from "./money";
import { emailService } from "@/lib/email";

export interface ProcessRefundParams {
  paymentId: string;
  amount: number;
  reason?: string;
  actorUserId?: string;
}

export interface ProcessRefundResult {
  success: boolean;
  refund: RefundRecord;
  paymentStatus: PaymentStatus;
  refundStatus: "partial" | "full";
  remainingRefundable: number;
}

/**
 * Executes a server-validated refund for an existing captured payment.
 * Strictly checks that refund amount <= captured amount - prior refunds.
 */
export async function processPaymentRefund(
  params: ProcessRefundParams
): Promise<ProcessRefundResult> {
  if (params.amount <= 0 || isNaN(params.amount)) {
    throw new PaymentRefundError("Refund amount must be greater than zero.");
  }

  // 1. Fetch Local Payment Record
  let payment: any = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("payments")
        .select("*, orders(*)")
        .eq("id", params.paymentId)
        .single();

      if (!error && data) {
        payment = {
          id: data.id,
          orderId: data.order_id,
          provider: data.provider,
          providerPaymentId: data.provider_payment_id,
          amount: Number(data.amount),
          currency: data.currency,
          status: data.status,
          refundStatus: data.refund_status || "none",
          refundAmount: Number(data.refund_amount || 0),
          order: data.orders,
        };
      }
    } catch {
      // Fallback
    }
  }

  if (!payment) {
    const local = dbStore.getPayment(params.paymentId);
    if (local) {
      const localOrd = dbStore.getOrder(local.orderId);
      payment = {
        ...local,
        order: localOrd,
      };
    }
  }

  if (!payment) {
    throw new PaymentRefundError(`Payment record "${params.paymentId}" not found.`);
  }

  // 2. Validate Payment Eligibility
  if (payment.status !== "captured" && payment.status !== "partially_refunded" && payment.status !== "succeeded") {
    throw new PaymentRefundError(
      `Cannot refund a payment with status "${payment.status}". Only captured payments can be refunded.`
    );
  }

  const providerTxId = payment.providerPaymentId || payment.providerOrderId;
  if (!providerTxId) {
    throw new PaymentRefundError("Cannot issue refund: missing provider transaction ID.");
  }

  const alreadyRefunded = Number(payment.refundAmount || 0);
  const totalAmount = Number(payment.amount);
  const maxAvailableToRefund = subtractMoney(totalAmount, alreadyRefunded);

  if (params.amount > maxAvailableToRefund) {
    throw new PaymentRefundError(
      `Requested refund of $${params.amount} exceeds remaining refundable balance of $${maxAvailableToRefund}.`
    );
  }

  // 3. Dispatch to Provider Gateway
  const provider = getPaymentProvider();
  const providerRefundResult = await provider.refundPayment({
    paymentId: payment.id,
    providerPaymentId: providerTxId,
    amount: params.amount,
    currency: payment.currency,
    reason: params.reason,
  });


  if (!providerRefundResult.success) {
    throw new PaymentRefundError(
      providerRefundResult.errorMessage || "Payment gateway rejected the refund request."
    );
  }

  // 4. Update Database State
  const newTotalRefunded = addMoney(alreadyRefunded, params.amount);
  const isFullRefund = newTotalRefunded >= totalAmount;
  const newPaymentStatus: PaymentStatus = isFullRefund ? "refunded" : "partially_refunded";
  const newRefundStatus: "partial" | "full" = isFullRefund ? "full" : "partial";
  const remainingRefundable = subtractMoney(totalAmount, newTotalRefunded);

  const localRefund = dbStore.createRefund({
    paymentId: payment.id,
    orderId: payment.orderId,
    provider: provider.name,
    providerRefundId: providerRefundResult.providerRefundId,
    amount: params.amount,
    currency: payment.currency,
    status: "succeeded",
    reason: params.reason,
    completedAt: new Date().toISOString(),
  });

  dbStore.updatePayment(payment.id, {
    status: newPaymentStatus,
    refundStatus: newRefundStatus,
    refundAmount: newTotalRefunded,
  });

  if (isFullRefund) {
    dbStore.updateOrder(payment.orderId, {
      paymentStatus: "refunded",
      orderStatus: "cancelled",
    });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServerClient();
      await supabase.from("refunds").insert({
        payment_id: payment.id,
        order_id: payment.orderId,
        provider: provider.name,
        provider_refund_id: providerRefundResult.providerRefundId,
        amount: params.amount,
        currency: payment.currency,
        status: "succeeded",
        reason: params.reason || null,
        completed_at: new Date().toISOString(),
      });

      await supabase
        .from("payments")
        .update({
          status: newPaymentStatus,
          refund_status: newRefundStatus,
          refund_amount: newTotalRefunded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (isFullRefund) {
        await supabase
          .from("orders")
          .update({
            payment_status: "refunded",
            order_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.orderId);
      }

      // Record Audit Log
      await supabase.from("audit_logs").insert({
        actor_user_id: params.actorUserId || null,
        action: "payment_refunded",
        entity_type: "payment",
        entity_id: payment.id,
        metadata: {
          orderId: payment.orderId,
          amount: params.amount,
          newTotalRefunded,
          isFullRefund,
          providerRefundId: providerRefundResult.providerRefundId,
          reason: params.reason,
        },
      });
    } catch (dbErr) {
      console.warn("[Refunds] Supabase persistence fallback:", dbErr);
    }
  }

  // 5. Customer Email Notification
  try {
    const customerEmail = payment.order?.email || payment.email;
    const customerName = payment.order?.shippingAddress?.fullName || "Valued Customer";
    const orderNumber = payment.order?.orderNumber || "Order";

    if (customerEmail) {
      await emailService.send({
        to: { email: customerEmail, name: customerName },
        subject: `Refund Issued: ${orderNumber} | MYCHOICE.in`,
        template: "refund_issued",
        data: {
          orderNumber,
          customerName,
          amount: params.amount,
          reason: params.reason || "Customer requested refund",
        },
      });
    }
  } catch (emailErr) {
    console.warn("[Refunds] Email notification dispatch failed:", emailErr);
  }

  return {
    success: true,
    refund: {
      id: localRefund.id,
      paymentId: payment.id,
      orderId: payment.orderId,
      provider: provider.name,
      providerRefundId: providerRefundResult.providerRefundId,
      amount: params.amount,
      currency: payment.currency,
      status: "succeeded",
      reason: params.reason,
      createdAt: localRefund.createdAt,
      completedAt: localRefund.completedAt,
    },
    paymentStatus: newPaymentStatus,
    refundStatus: newRefundStatus,
    remainingRefundable,
  };
}
