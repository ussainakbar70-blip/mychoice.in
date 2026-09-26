import React from "react";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of MYCHOICE.in and purchase agreements.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Effective Date: January 2026</p>
      </div>

      <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">1. Agreement to Terms</h2>
        <p>
          By accessing {SITE_CONFIG.siteUrl} or ordering products through our platform, you agree to be bound
          by these Terms of Service and applicable commerce regulations under Indian jurisdiction.
        </p>

        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">2. Product Pricing &amp; Authoritative Totals</h2>
        <p>
          All pricing displayed on the storefront is subject to authoritative server-side recalculation during checkout.
          Prices are stated in canonical base currency (USD) and converted into regional currencies according to our
          exchange schedule.
        </p>

        <h2 className="text-sm font-bold text-neutral-900 dark:text-white">3. Fulfillment &amp; International Transit</h2>
        <p>
          Products are routed via verified international logistics partners. While delivery averages 5 to 9 business days,
          customs inspections or severe weather may affect carrier timelines.
        </p>
      </div>
    </div>
  );
}
