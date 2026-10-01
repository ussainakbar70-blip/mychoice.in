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
import { MockPaymentProvider, mockPaymentProvider } from "./mock";

/**
 * Development Payment Provider
 * Uses MockPaymentProvider for seamless development sandbox execution.
 */
export class DevelopmentPaymentProvider extends MockPaymentProvider {
  override readonly name = "development";
}

export const developmentPaymentProvider = new DevelopmentPaymentProvider();
