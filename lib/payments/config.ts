/**
 * Payment Subsystem Configuration
 * 
 * Enforces strict boundary between client-safe public keys
 * and server-only secrets.
 */

import { PaymentProviderName } from "./types";

export interface PublicPaymentConfig {
  keyId: string;
  appId?: string;
  currency: string;
  provider: string;
  mode: "test" | "live";
}

export function isCashfreeConfigured(): boolean {
  return Boolean(
    (process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID) &&
      process.env.CASHFREE_SECRET_KEY &&
      !process.env.CASHFREE_APP_ID?.includes("placeholder")
  );
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      !process.env.RAZORPAY_KEY_ID.includes("placeholder")
  );
}

export function getPaymentCurrency(): string {
  return process.env.PAYMENT_CURRENCY || "INR";
}

export function getPaymentProviderName(): PaymentProviderName {
  const configured = process.env.PAYMENT_PROVIDER?.toLowerCase();
  if (configured === "cashfree") return "cashfree";
  if (configured === "razorpay") return "razorpay";
  if (configured === "mock") return "mock";
  if (configured === "development") return "development";

  // Auto-detect: if Cashfree keys are configured, use cashfree
  if (isCashfreeConfigured()) {
    return "cashfree";
  }
  // Auto-detect: if Razorpay keys are configured, use razorpay
  if (isRazorpayConfigured()) {
    return "razorpay";
  }
  return "cashfree";
}

export function getPaymentMode(): "test" | "live" {
  const mode = process.env.PAYMENT_MODE?.toLowerCase();
  if (mode === "live" || mode === "production") return "live";
  return "test";
}

/**
 * Returns safe public payment configuration to be sent to the browser.
 * NEVER returns secrets!
 */
export function getPublicPaymentConfig(): PublicPaymentConfig {
  const provider = getPaymentProviderName();
  const mode = getPaymentMode();

  let keyId = "";
  let appId = "";

  if (provider === "cashfree") {
    appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || "CF_TEST_APP_ID";
    keyId = appId;
  } else if (provider === "razorpay") {
    keyId = process.env.RAZORPAY_KEY_ID || "";
  } else {
    keyId = "mock_key_live_test";
  }

  return {
    keyId,
    appId,
    currency: getPaymentCurrency(),
    provider,
    mode,
  };
}

/**
 * Server-only helper: retrieves Cashfree server secret credentials.
 * Throws if called in client bundles.
 */
export function getServerCashfreeSecrets(): {
  appId: string;
  secretKey: string;
  apiVersion: string;
  webhookSecret: string;
  environment: "sandbox" | "production";
  baseUrl: string;
  isSandbox: boolean;
} {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: Payment secrets must NEVER be accessed in client bundles!");
  }

  const mode = getPaymentMode();
  const appId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || "";
  const secretKey = process.env.CASHFREE_SECRET_KEY || "";
  const apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || secretKey;
  const environment = mode === "live" ? "production" : "sandbox";
  const baseUrl = mode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  const isSandbox = environment === "sandbox";

  return {
    appId,
    secretKey,
    apiVersion,
    webhookSecret,
    environment,
    baseUrl,
    isSandbox,
  };
}

/**
 * Server-only helper: retrieves server secret credentials.
 * Throws if called in client bundles.
 */
export function getServerRazorpaySecrets(): {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
} {
  if (typeof window !== "undefined") {
    throw new Error("SECURITY VIOLATION: Payment secrets must NEVER be accessed in client bundles!");
  }

  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

  return { keyId, keySecret, webhookSecret };
}

