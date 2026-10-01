/**
 * Core Payment Domain Types and Provider Abstraction
 */

export type PaymentStatus =
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "disputed";

export type OrderPaymentStatus =
  | "unpaid"
  | "pending"
  | "pending_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "manual_review";

export type RefundStatus = "none" | "pending" | "partial" | "full" | "failed";

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  providerSignature?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: string | null;
  email?: string | null;
  contact?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  refundStatus: RefundStatus;
  refundAmount: number;
  paidAt?: string | null;
  capturedAt?: string | null;
  rawResponse?: Record<string, any> | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderId: string;
  provider: string;
  providerRefundId?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  reason?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string | null;
}

export interface WebhookEventRecord {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  signature?: string | null;
  payloadHash?: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processingError?: string | null;
  receivedAt: string;
  processedAt?: string | null;
}

export interface CreatePaymentOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in primary currency, e.g. INR 499.00
  currency: string; // e.g. "INR"
  customerEmail?: string | null;
  customerName: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  receipt?: string;
}

export type PaymentProviderName = "cashfree" | "razorpay" | "mock" | "development";

export interface CreatePaymentOrderResult {
  success: boolean;
  provider: string;
  providerOrderId: string;
  paymentSessionId?: string;
  amount: number;
  amountMinor: number; // e.g. 49900 paise
  currency: string;
  keyId?: string;
  status: PaymentStatus;
  errorMessage?: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: string;
  email?: string;
  contact?: string;
  errorMessage?: string;
}

export interface PaymentProviderDetails {
  providerPaymentId: string;
  providerOrderId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: string;
  email?: string;
  contact?: string;
  captured: boolean;
  refunded: boolean;
  amountRefunded: number;
  raw?: Record<string, any>;
}

export interface RefundPaymentParams {
  paymentId: string;
  providerPaymentId: string;
  amount: number; // in primary currency, e.g. INR 200.00
  currency: string;
  reason?: string;
  notes?: Record<string, string>;
}

export interface RefundPaymentResult {
  success: boolean;
  providerRefundId?: string;
  status: "succeeded" | "failed" | "pending";
  amountRefunded: number;
  currency: string;
  errorMessage?: string;
  raw?: Record<string, any>;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  error?: {
    code?: string;
    description?: string;
  };
  refund?: {
    id: string;
    amount: number;
    status: string;
  };
  raw: Record<string, any>;
}

export interface SafeCheckoutPayload {
  keyId: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerOrderId: string;
  paymentSessionId?: string;
  appId?: string;
  mode?: "test" | "live" | "sandbox" | "production";
  amount: number;
  amountMinor: number;
  currency: string;
  customer: {
    name: string;
    email?: string | null;
    contact?: string;
  };
}

export interface PaymentReconciliationResult {
  orderId: string;
  orderNumber: string;
  provider: string;
  providerStatus: string;
  localStatus: string;
  isDiscrepancy: boolean;
  resolutionApplied?: string;
  message: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentOrder(params: CreatePaymentOrderParams): Promise<CreatePaymentOrderResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;
  fetchPayment(paymentId: string): Promise<PaymentProviderDetails | null>;
  capturePayment?(paymentId: string, amount: number, currency: string): Promise<PaymentProviderDetails>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
  verifyWebhook(rawBody: string, signature: string, timestamp?: string): boolean;
  parseWebhookEvent(rawBody: string, headers?: Record<string, string | string[] | undefined>): WebhookEventPayload | null;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}
