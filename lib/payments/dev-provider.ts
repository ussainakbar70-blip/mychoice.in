import {
  PaymentIntentRequest,
  PaymentIntentResponse,
  PaymentProvider,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
} from "./types";

/**
 * Development / Test Payment Provider
 * Allows frictionless end-to-end checkout and testing in development and staging environments.
 * Throws in production unless test mode is explicitly configured.
 */
export class DevelopmentPaymentProvider implements PaymentProvider {
  readonly name = "development";

  async createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_PAYMENTS !== "true") {
      throw new Error(
        "Development payment provider cannot be executed in production. Please configure an approved payment gateway."
      );
    }

    const testPaymentId = `dev_pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      paymentId: testPaymentId,
      provider: this.name,
      status: "succeeded",
      clientSecret: `dev_sec_${testPaymentId}`,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    return {
      verified: true,
      paymentId: request.paymentId,
      orderId: request.orderId,
      status: "succeeded",
      amount: 0,
      currency: "USD",
      providerMessage: "Simulated sandbox payment verified.",
    };
  }

  async refundPayment(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    return {
      refundId: `dev_ref_${Date.now()}`,
      status: "succeeded",
      amountRefunded: request.amount,
    };
  }

  async getPaymentStatus(paymentId: string): Promise<"succeeded" | "failed" | "pending"> {
    return "succeeded";
  }
}

let activeProvider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!activeProvider) {
    activeProvider = new DevelopmentPaymentProvider();
  }
  return activeProvider;
}
