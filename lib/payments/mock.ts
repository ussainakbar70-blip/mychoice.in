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
import { toPaise } from "./money";
import { PaymentVerificationError } from "./errors";

/**
 * High-Fidelity Mock Payment Provider
 * 
 * Allows deterministic automated testing and sandboxing without real gateway charges.
 * Supports configurable simulation of network failures, signature errors, and refunds.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name: string = "mock";

  private orders: Map<string, CreatePaymentOrderParams> = new Map();
  private payments: Map<string, PaymentProviderDetails> = new Map();
  private refunds: Map<string, RefundPaymentResult> = new Map();

  // Test simulation switches
  private simulateFailure = false;
  private simulateSignatureFailure = false;
  private simulateAmountMismatch = false;

  setSimulateFailure(value: boolean): void {
    this.simulateFailure = value;
  }

  setSimulateSignatureFailure(value: boolean): void {
    this.simulateSignatureFailure = value;
  }

  setSimulateAmountMismatch(value: boolean): void {
    this.simulateAmountMismatch = value;
  }

  reset(): void {
    this.orders.clear();
    this.payments.clear();
    this.refunds.clear();
    this.simulateFailure = false;
    this.simulateSignatureFailure = false;
    this.simulateAmountMismatch = false;
  }

  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        provider: this.name,
        providerOrderId: "",
        amount: params.amount,
        amountMinor: toPaise(params.amount),
        currency: params.currency,
        status: "failed",
        errorMessage: "Simulated gateway rejection",
      };
    }

    const providerOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.orders.set(providerOrderId, params);

    return {
      success: true,
      provider: this.name,
      providerOrderId,
      paymentSessionId: `session_mock_${Date.now()}`,
      amount: params.amount,
      amountMinor: toPaise(params.amount),
      currency: params.currency || "INR",
      keyId: "mock_key_test_id",
      status: "created",
    };
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    if (this.simulateSignatureFailure || params.providerSignature === "invalid_signature") {
      throw new PaymentVerificationError("Invalid simulated payment signature.");
    }

    const orderData = this.orders.get(params.providerOrderId);
    const amount = orderData ? orderData.amount : (params.expectedAmount || 100);
    const currency = orderData ? orderData.currency : (params.expectedCurrency || "INR");

    if (this.simulateAmountMismatch) {
      throw new PaymentVerificationError("Simulated amount mismatch.");
    }

    const details: PaymentProviderDetails = {
      providerPaymentId: params.providerPaymentId,
      providerOrderId: params.providerOrderId,
      status: "captured",
      amount,
      currency,
      method: "upi",
      email: orderData?.customerEmail || "customer@example.com",
      contact: orderData?.customerPhone || "+919876543210",
      captured: true,
      refunded: false,
      amountRefunded: 0,
    };

    this.payments.set(params.providerPaymentId, details);

    return {
      verified: true,
      provider: this.name,
      providerOrderId: params.providerOrderId,
      providerPaymentId: params.providerPaymentId,
      status: "captured",
      amount,
      currency,
      method: "upi",
      email: details.email,
      contact: details.contact,
    };
  }

  async fetchPayment(paymentId: string): Promise<PaymentProviderDetails | null> {
    const existing = this.payments.get(paymentId);
    if (existing) return existing;

    // Return synthetic captured payment for testing
    return {
      providerPaymentId: paymentId,
      providerOrderId: `order_mock_${paymentId}`,
      status: "captured",
      amount: 499.00,
      currency: "INR",
      method: "card",
      captured: true,
      refunded: false,
      amountRefunded: 0,
    };
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    if (this.simulateFailure) {
      return {
        success: false,
        status: "failed",
        amountRefunded: 0,
        currency: params.currency,
        errorMessage: "Simulated refund gateway error",
      };
    }

    const refundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result: RefundPaymentResult = {
      success: true,
      providerRefundId: refundId,
      status: "succeeded",
      amountRefunded: params.amount,
      currency: params.currency,
    };

    this.refunds.set(refundId, result);
    return result;
  }

  verifyWebhook(rawBody: string, signature: string, timestamp?: string): boolean {
    if (this.simulateSignatureFailure || signature === "invalid_webhook_signature") {
      return false;
    }
    return Boolean(signature && signature.length > 5);
  }

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null {
    try {
      const data = JSON.parse(rawBody);
      const eventId =
        data.event_id ||
        (data.data?.payment?.cf_payment_id ? String(data.data.payment.cf_payment_id) : undefined) ||
        (data.data?.refund?.cf_refund_id ? String(data.data.refund.cf_refund_id) : undefined) ||
        `ev_mock_${Date.now()}`;

      return {
        eventId,
        eventType: data.type || data.event || "payment.captured",
        provider: this.name,
        providerPaymentId:
          data.payload?.payment?.entity?.id ||
          (data.data?.payment?.cf_payment_id ? String(data.data.payment.cf_payment_id) : undefined) ||
          `pay_mock_${Date.now()}`,
        providerOrderId:
          data.payload?.payment?.entity?.order_id ||
          data.data?.order?.order_id ||
          `order_mock_${Date.now()}`,
        amount: data.payload?.payment?.entity?.amount
          ? data.payload.payment.entity.amount / 100
          : data.data?.payment?.payment_amount ?? 499,
        currency: data.payload?.payment?.entity?.currency || data.data?.payment?.payment_currency || "INR",
        status: "captured",
        raw: data,
      };
    } catch {
      return null;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const p = await this.fetchPayment(paymentId);
    return p ? p.status : "failed";
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
