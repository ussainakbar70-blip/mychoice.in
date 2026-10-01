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
import { getServerCashfreeSecrets } from "./config";
import { verifyCashfreeWebhookSignature } from "./verification";
import { toPaise, fromPaise } from "./money";
import { PaymentGatewayError, PaymentVerificationError } from "./errors";

function sanitizeOrderId(orderId: string): string {
  // Cashfree allows alphanumeric, hyphens, and underscores; max 45 chars
  return orderId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45);
}

function sanitizePhoneNumber(phone?: string): string {
  if (!phone) return "9999999999";
  const cleaned = phone.replace(/[^0-9]/g, "");
  // Take last 10 digits
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return "9999999999";
}

export interface CashfreeProviderConfig {
  appId?: string;
  secretKey?: string;
  webhookSecret?: string;
  mode?: "sandbox" | "test" | "production" | "live";
  apiVersion?: string;
}

export class CashfreePaymentProvider implements PaymentProvider {
  readonly name = "cashfree";
  private config?: CashfreeProviderConfig;

  constructor(config?: CashfreeProviderConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    const serverSecrets = getServerCashfreeSecrets();
    const appId = this.config?.appId || serverSecrets.appId;
    const secretKey = this.config?.secretKey || serverSecrets.secretKey;
    const apiVersion = this.config?.apiVersion || serverSecrets.apiVersion;

    if (!appId || !secretKey) {
      throw new PaymentGatewayError("Cashfree credentials are not configured on the server.");
    }
    return {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      "Content-Type": "application/json",
    };
  }

  getBaseUrl(): string {
    if (this.config?.mode === "production" || this.config?.mode === "live") {
      return "https://api.cashfree.com/pg";
    }
    if (this.config?.mode === "sandbox" || this.config?.mode === "test") {
      return "https://sandbox.cashfree.com/pg";
    }
    const { baseUrl } = getServerCashfreeSecrets();
    return baseUrl;
  }

  async createPaymentOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult> {
    const { appId } = getServerCashfreeSecrets();
    const amountMinor = toPaise(params.amount);

    if (params.amount <= 0 || amountMinor <= 0) {
      throw new PaymentGatewayError("Order amount must be greater than zero.");
    }

    const safeOrderId = sanitizeOrderId(params.orderId);
    const customerPhone = sanitizePhoneNumber(params.customerPhone);
    const customerId = `cust_${params.orderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30)}` || "cust_guest";
    const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://mychoice.in";

    try {
      const response = await fetch(`${this.getBaseUrl()}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          order_id: safeOrderId,
          order_amount: params.amount,
          order_currency: params.currency || "INR",
          customer_details: {
            customer_id: customerId,
            customer_name: params.customerName || "Customer",
            ...(params.customerEmail && params.customerEmail.trim()
              ? { customer_email: params.customerEmail.trim() }
              : {}),
            customer_phone: customerPhone,
          },
          order_meta: {
            return_url: `${appBaseUrl}/checkout/cashfree-callback?order_id={order_id}`,
            notify_url: `${appBaseUrl}/api/webhooks/cashfree`,
            payment_methods: "cc,dc,upi,nb,app,paylater",
          },
          order_note: `Order ${params.orderNumber}`,
          order_tags: {
            orderNumber: params.orderNumber,
            localOrderId: params.orderId,
            ...params.notes,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const description =
          errorData.message ||
          errorData.error?.description ||
          `Cashfree order creation failed with status ${response.status}`;
        throw new PaymentGatewayError(description, response.status);
      }

      const data = await response.json();

      return {
        success: true,
        provider: this.name,
        providerOrderId: data.order_id || safeOrderId,
        paymentSessionId: data.payment_session_id,
        amount: data.order_amount ?? params.amount,
        amountMinor: toPaise(data.order_amount ?? params.amount),
        currency: data.order_currency || params.currency,
        keyId: appId,
        status: "created",
      };
    } catch (err: unknown) {
      if (err instanceof PaymentGatewayError) throw err;
      throw new PaymentGatewayError(
        err instanceof Error ? err.message : "Network error contacting Cashfree API"
      );
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    const safeOrderId = sanitizeOrderId(params.providerOrderId || params.orderId);

    try {
      // 1. Authoritative Server-side Verification via Cashfree PG REST API
      const orderRes = await fetch(`${this.getBaseUrl()}/orders/${safeOrderId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!orderRes.ok) {
        throw new PaymentVerificationError(`Order not found on Cashfree: HTTP ${orderRes.status}`);
      }

      const orderData = await orderRes.json();

      // Check payments for this order to find the successful payment transaction
      let paymentsData: any[] = [];
      try {
        const payRes = await fetch(`${this.getBaseUrl()}/orders/${safeOrderId}/payments`, {
          method: "GET",
          headers: this.getHeaders(),
        });
        if (payRes.ok) {
          paymentsData = await payRes.json();
        }
      } catch {
        // Fall back to orderData alone
      }

      const successfulPayment = Array.isArray(paymentsData)
        ? paymentsData.find((p) => p.payment_status === "SUCCESS")
        : null;

      const isPaid = orderData.order_status === "PAID" || Boolean(successfulPayment);

      if (!isPaid) {
        throw new PaymentVerificationError(
          `Cashfree order status is ${orderData.order_status}, not paid.`
        );
      }

      // Verify amount match if expected amount was provided
      if (params.expectedAmount !== undefined) {
        const expectedMinor = toPaise(params.expectedAmount);
        const actualMinor = toPaise(orderData.order_amount);
        if (actualMinor !== expectedMinor) {
          const curr = params.expectedCurrency || orderData.order_currency || "$";
          throw new PaymentVerificationError(
            `Payment amount mismatch: expected ${curr} ${params.expectedAmount} but Cashfree captured ${orderData.order_currency || curr} ${orderData.order_amount}`
          );
        }
      }

      // Verify currency match if expected currency was provided
      if (params.expectedCurrency && orderData.order_currency) {
        if (orderData.order_currency.toUpperCase() !== params.expectedCurrency.toUpperCase()) {
          throw new PaymentVerificationError(
            `Payment currency mismatch: expected ${params.expectedCurrency} but Cashfree captured ${orderData.order_currency}`
          );
        }
      }

      const paymentId = successfulPayment?.cf_payment_id
        ? String(successfulPayment.cf_payment_id)
        : params.providerPaymentId || safeOrderId;

      return {
        verified: true,
        provider: this.name,
        providerOrderId: safeOrderId,
        providerPaymentId: paymentId,
        status: "captured",
        amount: orderData.order_amount,
        currency: orderData.order_currency || "INR",
        method: successfulPayment?.payment_group || "cashfree",
        email: successfulPayment?.customer_details?.customer_email || orderData.customer_details?.customer_email,
        contact: successfulPayment?.customer_details?.customer_phone || orderData.customer_details?.customer_phone,
      };
    } catch (err: unknown) {
      if (err instanceof PaymentVerificationError) throw err;
      throw new PaymentVerificationError(
        err instanceof Error ? err.message : "Error verifying payment with Cashfree"
      );
    }
  }

  async fetchPayment(orderOrPaymentId: string): Promise<PaymentProviderDetails | null> {
    const safeOrderId = sanitizeOrderId(orderOrPaymentId);

    try {
      const response = await fetch(`${this.getBaseUrl()}/orders/${safeOrderId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new PaymentGatewayError(`Failed to fetch Cashfree order: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapCashfreeOrderToDetails(data);
    } catch (err: unknown) {
      if (err instanceof PaymentGatewayError) throw err;
      throw new PaymentGatewayError(
        err instanceof Error ? err.message : "Network error fetching Cashfree order"
      );
    }
  }

  async refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult> {
    const safeOrderId = sanitizeOrderId(params.providerPaymentId || params.paymentId);
    const refundId = `rf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const response = await fetch(`${this.getBaseUrl()}/orders/${safeOrderId}/refunds`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          refund_id: refundId,
          refund_amount: params.amount,
          refund_note: params.reason || "Customer refund request",
          refund_speed: "STANDARD",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const description =
          errorData.message ||
          errorData.error?.description ||
          `Cashfree refund failed with status ${response.status}`;
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
      const isSuccess = data.refund_status === "SUCCESS" || data.refund_status === "PENDING";

      return {
        success: isSuccess,
        providerRefundId: data.cf_refund_id ? String(data.cf_refund_id) : data.refund_id || refundId,
        status: data.refund_status === "SUCCESS" ? "succeeded" : "pending",
        amountRefunded: data.refund_amount ?? params.amount,
        currency: data.refund_currency || params.currency,
        raw: data,
      };
    } catch (err: unknown) {
      return {
        success: false,
        status: "failed",
        amountRefunded: 0,
        currency: params.currency,
        errorMessage: err instanceof Error ? err.message : "Network error during Cashfree refund",
      };
    }
  }

  verifyWebhook(rawBody: string, signature: string, timestamp?: string): boolean {
    const secret =
      this.config?.webhookSecret ||
      this.config?.secretKey ||
      getServerCashfreeSecrets().webhookSecret;
    return verifyCashfreeWebhookSignature(rawBody, timestamp || "", signature, secret);
  }

  getApiVersion(): string {
    return this.config?.apiVersion || getServerCashfreeSecrets().apiVersion;
  }

  getAppId(): string {
    return this.config?.appId || getServerCashfreeSecrets().appId;
  }

  isSandbox(): boolean {
    if (this.config?.mode) {
      return this.config.mode === "sandbox" || this.config.mode === "test";
    }
    return getServerCashfreeSecrets().isSandbox;
  }

  parseWebhookEvent(
    rawBody: string,
    headers?: Record<string, string | string[] | undefined>
  ): WebhookEventPayload | null {
    try {
      const data = JSON.parse(rawBody);

      // Support Cashfree modern format: { data: { order, payment, refund }, type: "PAYMENT_SUCCESS_WEBHOOK", event_time: "..." }
      const eventType = data.type || data.event || "UNKNOWN";
      const orderData = data.data?.order || data.order || {};
      const paymentData = data.data?.payment || data.payment || {};
      const refundData = data.data?.refund || data.refund || {};

      const eventId =
        data.event_id ||
        (paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : undefined) ||
        (refundData.cf_refund_id ? String(refundData.cf_refund_id) : undefined) ||
        `${eventType}_${orderData.order_id || Date.now()}`;


      let status: PaymentStatus | undefined;
      if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || paymentData.payment_status === "SUCCESS") {
        status = "captured";
      } else if (
        eventType === "PAYMENT_FAILED_WEBHOOK" ||
        paymentData.payment_status === "FAILED" ||
        eventType === "PAYMENT_USER_DROPPED_WEBHOOK"
      ) {
        status = "failed";
      } else if (eventType === "REFUND_STATUS_WEBHOOK" && refundData.refund_status === "SUCCESS") {
        status = "refunded";
      } else {
        status = "pending";
      }

      return {
        eventId,
        eventType,
        provider: this.name,
        providerPaymentId: paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
        providerOrderId: orderData.order_id,
        amount: paymentData.payment_amount ?? orderData.order_amount,
        currency: paymentData.payment_currency ?? orderData.order_currency ?? "INR",
        status,
        error: paymentData.payment_message
          ? {
              code: String(paymentData.bank_reference || "GATEWAY_ERROR"),
              description: paymentData.payment_message,
            }
          : undefined,
        refund: refundData.cf_refund_id
          ? {
              id: String(refundData.cf_refund_id),
              amount: refundData.refund_amount,
              status: refundData.refund_status,
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

  private mapCashfreeOrderToDetails(data: any): PaymentProviderDetails {
    const isPaid = data.order_status === "PAID";
    const status: PaymentStatus = isPaid
      ? "captured"
      : data.order_status === "EXPIRED" || data.order_status === "TERMINATED"
      ? "failed"
      : "pending";

    return {
      providerPaymentId: data.cf_order_id ? String(data.cf_order_id) : data.order_id,
      providerOrderId: data.order_id,
      status,
      amount: data.order_amount,
      currency: data.order_currency || "INR",
      method: "cashfree",
      email: data.customer_details?.customer_email,
      contact: data.customer_details?.customer_phone,
      captured: isPaid,
      refunded: false,
      amountRefunded: 0,
      raw: data,
    };
  }
}
