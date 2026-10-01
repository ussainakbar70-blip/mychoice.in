import {
  CreatePaymentOrderParams,
  CreatePaymentOrderResult,
  PaymentProvider,
  PaymentProviderDetails,
  PaymentStatus,
  RefundPaymentParams,
  RefundPaymentResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  WebhookEventPayload,
} from "./types";
import { getServerRazorpaySecrets, isRazorpayConfigured } from "./config";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "./verification";
import { toPaise, fromPaise } from "./money";
import { PaymentGatewayError, PaymentVerificationError } from "./errors";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "razorpay";

  private getAuthHeader(): string {
    const { keyId, keySecret } = getServerRazorpaySecrets();
    if (!keyId || !keySecret) {
      throw new PaymentGatewayError("Razorpay credentials are not configured on the server.");
    }
    const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return `Basic ${token}`;
  }

  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult> {
    const { keyId } = getServerRazorpaySecrets();
    const amountMinor = toPaise(params.amount);

    if (amountMinor <= 0) {
      throw new PaymentGatewayError("Order amount in minor units must be greater than zero.");
    }

    try {
      const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountMinor,
          currency: params.currency || "INR",
          receipt: params.orderNumber.substring(0, 40),
          notes: {
            localOrderId: params.orderId,
            orderNumber: params.orderNumber,
            customerEmail: params.customerEmail,
            ...params.notes,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const description = errorData.error?.description || `Razorpay order creation failed with HTTP ${response.status}`;
        throw new PaymentGatewayError(description, response.status);
      }

      const data = await response.json();

      return {
        success: true,
        provider: this.name,
        providerOrderId: data.id,
        amount: params.amount,
        amountMinor,
        currency: data.currency || params.currency,
        keyId,
        status: "created",
      };
    } catch (err: unknown) {
      if (err instanceof PaymentGatewayError) throw err;
      throw new PaymentGatewayError(
        err instanceof Error ? err.message : "Network error contacting Razorpay API"
      );
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const { keySecret } = getServerRazorpaySecrets();

    // 1. Cryptographic Signature Verification
    const isValid = verifyRazorpayPaymentSignature(
      params.providerOrderId,
      params.providerPaymentId,
      params.providerSignature,
      keySecret
    );

    if (!isValid) {
      throw new PaymentVerificationError("Invalid payment signature received from gateway.");
    }

    // 2. Authoritative Server-side Verification via Razorpay REST API
    const payment = await this.fetchPayment(params.providerPaymentId);
    if (!payment) {
      throw new PaymentVerificationError("Payment ID not found in Razorpay records.");
    }

    // Verify order id match
    if (payment.providerOrderId && payment.providerOrderId !== params.providerOrderId) {
      throw new PaymentVerificationError("Payment does not match the associated Razorpay order ID.");
    }

    // Verify amount match if expected amount was provided
    if (params.expectedAmount !== undefined) {
      const expectedMinor = toPaise(params.expectedAmount);
      const actualMinor = toPaise(payment.amount);
      if (actualMinor !== expectedMinor) {
        throw new PaymentVerificationError(
          `Payment amount mismatch: expected $${params.expectedAmount} but gateway captured $${payment.amount}`
        );
      }
    }

    return {
      verified: true,
      provider: this.name,
      providerOrderId: params.providerOrderId,
      providerPaymentId: params.providerPaymentId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
    };
  }

  async fetchPayment(paymentId: string): Promise<PaymentProviderDetails | null> {
    try {
      const response = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const errText = await response.text();
        throw new PaymentGatewayError(`Failed to fetch payment details: ${errText}`);
      }

      const data = await response.json();
      return this.mapRazorpayPaymentToDetails(data);
    } catch (err: unknown) {
      if (err instanceof PaymentGatewayError) throw err;
      throw new PaymentGatewayError(
        err instanceof Error ? err.message : "Network error fetching Razorpay payment"
      );
    }
  }

  async capturePayment(
    paymentId: string,
    amount: number,
    currency: string
  ): Promise<PaymentProviderDetails> {
    try {
      const response = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}/capture`, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: toPaise(amount),
          currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PaymentGatewayError(
          errorData.error?.description || "Failed to capture Razorpay payment"
        );
      }

      const data = await response.json();
      return this.mapRazorpayPaymentToDetails(data);
    } catch (err: unknown) {
      if (err instanceof PaymentGatewayError) throw err;
      throw new PaymentGatewayError(
        err instanceof Error ? err.message : "Error capturing Razorpay payment"
      );
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    try {
      const payload: Record<string, any> = {
        amount: toPaise(params.amount),
      };
      if (params.notes) {
        payload.notes = params.notes;
      }

      const response = await fetch(
        `${RAZORPAY_API_BASE}/payments/${params.providerPaymentId}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const description = errorData.error?.description || `Razorpay refund failed with status ${response.status}`;
        return {
          success: false,
          status: "failed",
          amountRefunded: 0,
          currency: params.currency,
          errorMessage: description,
          raw: errorData,
        };
      }

      const data = await response.json();
      return {
        success: true,
        providerRefundId: data.id,
        status: "succeeded",
        amountRefunded: fromPaise(data.amount),
        currency: data.currency || params.currency,
        raw: data,
      };
    } catch (err: unknown) {
      return {
        success: false,
        status: "failed",
        amountRefunded: 0,
        currency: params.currency,
        errorMessage: err instanceof Error ? err.message : "Network error during refund",
      };
    }
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const { webhookSecret } = getServerRazorpaySecrets();
    return verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
  }

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null {
    try {
      const data = JSON.parse(rawBody);
      const eventType = data.event;
      const paymentEntity = data.payload?.payment?.entity;
      const orderEntity = data.payload?.order?.entity;
      const refundEntity = data.payload?.refund?.entity;

      return {
        eventId: data.event_id || `ev_${Date.now()}`,
        eventType,
        provider: this.name,
        providerPaymentId: paymentEntity?.id,
        providerOrderId: paymentEntity?.order_id || orderEntity?.id,
        amount: paymentEntity?.amount ? fromPaise(paymentEntity.amount) : undefined,
        currency: paymentEntity?.currency,
        status: paymentEntity ? this.mapRazorpayStatus(paymentEntity.status) : undefined,
        error: paymentEntity?.error_code
          ? {
              code: paymentEntity.error_code,
              description: paymentEntity.error_description,
            }
          : undefined,
        refund: refundEntity
          ? {
              id: refundEntity.id,
              amount: fromPaise(refundEntity.amount),
              status: refundEntity.status,
            }
          : undefined,
        raw: data,
      };
    } catch {
      return null;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const details = await this.fetchPayment(paymentId);
    return details ? details.status : "failed";
  }

  private mapRazorpayStatus(status: string): PaymentStatus {
    switch (status) {
      case "created":
        return "created";
      case "authorized":
        return "authorized";
      case "captured":
        return "captured";
      case "refunded":
        return "refunded";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }

  private mapRazorpayPaymentToDetails(data: any): PaymentProviderDetails {
    return {
      providerPaymentId: data.id,
      providerOrderId: data.order_id,
      status: this.mapRazorpayStatus(data.status),
      amount: fromPaise(data.amount),
      currency: data.currency,
      method: data.method,
      email: data.email,
      contact: data.contact,
      captured: Boolean(data.captured),
      refunded: Boolean(data.refund_status === "full"),
      amountRefunded: data.amount_refunded ? fromPaise(data.amount_refunded) : 0,
      raw: data,
    };
  }
}
