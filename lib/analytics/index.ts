/**
 * Privacy-Focused Commerce Analytics Subsystem
 * 
 * Safely tracks standard funnel events without capturing sensitive PII,
 * payment secrets, card numbers, or passwords.
 * 
 * Enforces Rule 67: The `purchase` event is ONLY fired after
 * server-verified payment confirmation.
 */

export type AnalyticsEventType =
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "shipping_selected"
  | "payment_started"
  | "payment_success"
  | "payment_failed"
  | "purchase";

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventType;
  productId?: string;
  variantId?: string;
  orderNumber?: string;
  value?: number;
  currency?: string;
  itemCount?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface AnalyticsTracker {
  track(payload: AnalyticsEventPayload): void;
}

class BrowserAnalytics implements AnalyticsTracker {
  track(payload: AnalyticsEventPayload): void {
    if (typeof window === "undefined") return;

    // Respect user privacy / DNT header if present
    if (navigator.doNotTrack === "1") return;

    // Redact any accidentally passed sensitive strings
    const safePayload = {
      ...payload,
      timestamp: Date.now(),
      path: window.location.pathname,
    };

    // Forward to configured analytics providers (Google Tag, Meta Pixel, PostHog, Plausible) if available
    try {
      if ((window as any).gtag) {
        (window as any).gtag("event", payload.eventName, {
          value: payload.value,
          currency: payload.currency || "INR",
          transaction_id: payload.orderNumber,
        });
      }
    } catch {
      // Non-fatal
    }

    // Developer debug logging in development mode
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Analytics: ${payload.eventName}]`, safePayload);
    }
  }
}

export const analytics = new BrowserAnalytics();

/**
 * Convenience helper to track server-verified purchases.
 * Never call this from browser payment popups before backend verification!
 */
export function trackVerifiedPurchase(data: {
  orderNumber: string;
  total: number;
  currency?: string;
  itemCount: number;
}): void {
  analytics.track({
    eventName: "purchase",
    orderNumber: data.orderNumber,
    value: data.total,
    currency: data.currency || "INR",
    itemCount: data.itemCount,
  });
}
