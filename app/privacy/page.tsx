import React from "react";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MYCHOICE.in safeguards personal information, order telemetry, and checkout data.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Last Updated: January 2026</p>
      </div>

      <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">1. Data We Collect</h2>
        <p>
          We collect personal details necessary to fulfill customer orders, including name, shipping address,
          email address, and contact telephone numbers. Payment transaction tokens are processed exclusively
          by secure payment gateway adapters; credit card numbers are never stored on our servers.
        </p>

        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">2. Fulfillment Telemetry</h2>
        <p>
          To deliver goods to your doorstep, verified order details (shipping recipient name, destination address,
          and SKU line items) are communicated via encrypted TLS connections to our logistics and supplier
          platform (CJdropshipping).
        </p>

        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">3. Your Data Rights</h2>
        <p>
          You have the right to request access to your stored personal records or request their deletion by
          emailing our privacy officer at {SITE_CONFIG.contact.email}.
        </p>
      </div>
    </div>
  );
}
