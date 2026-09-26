export interface PaymentIntentRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  success: boolean;
  paymentId: string;
  provider: string;
  status: "pending" | "succeeded" | "failed" | "requires_action";
  clientSecret?: string;
  redirectUrl?: string;
  errorMessage?: string;
}

export interface PaymentVerificationRequest {
  paymentId: string;
  orderId: string;
  providerSignature?: string;
  rawPayload?: Record<string, unknown>;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  paymentId: string;
  orderId: string;
  status: "succeeded" | "failed" | "pending";
  amount: number;
  currency: string;
  providerMessage?: string;
}

export interface PaymentRefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  refundId: string;
  status: "succeeded" | "failed";
  amountRefunded: number;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;
  verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse>;
  refundPayment(request: PaymentRefundRequest): Promise<PaymentRefundResponse>;
  getPaymentStatus(paymentId: string): Promise<"succeeded" | "failed" | "pending">;
}
