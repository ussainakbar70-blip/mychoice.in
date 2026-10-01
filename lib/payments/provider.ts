import { PaymentProvider } from "./types";
import { getPaymentProviderName, isCashfreeConfigured, isRazorpayConfigured } from "./config";
import { CashfreePaymentProvider } from "./cashfree";
import { RazorpayPaymentProvider } from "./razorpay";
import { mockPaymentProvider } from "./mock";

let customProvider: PaymentProvider | null = null;

/**
 * Returns the active server PaymentProvider.
 * Decouples checkout and order workflows from concrete gateway SDKs.
 */
export function getPaymentProvider(): PaymentProvider {
  if (customProvider) {
    return customProvider;
  }

  const configured = getPaymentProviderName();
  if (configured === "cashfree" && isCashfreeConfigured()) {
    return new CashfreePaymentProvider();
  }

  if (configured === "razorpay" && isRazorpayConfigured()) {
    return new RazorpayPaymentProvider();
  }

  return mockPaymentProvider;
}

/**
 * Allows automated tests to inject mock providers without mutating environment variables.
 */
export function setPaymentProviderForTesting(provider: PaymentProvider | null): void {
  customProvider = provider;
}
