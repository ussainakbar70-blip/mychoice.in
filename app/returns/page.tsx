import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Ban, Truck, Mail, ShieldAlert } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

import { buildBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Return & Cancellation Policy | Final Sale Guidelines",
  description: "Official Return & Cancellation Policy for MYCHOICE - Automated direct-to-supplier dropshipping fulfillment, no cancellations, and final sale guidelines.",
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/returns`,
  },
  openGraph: {
    title: `Return & Cancellation Policy | ${SITE_CONFIG.brandName}`,
    description: "Official Return & Cancellation Policy for MYCHOICE - Automated dropshipping fulfillment and final sale guidelines.",
    url: `${SITE_CONFIG.siteUrl}/returns`,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
  },
};

export default function ReturnsPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Return & Cancellation Policy", url: "/returns" },
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Page Header */}
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          Store Guidelines
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Return &amp; Cancellation Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-xl mx-auto">
          Please review our order processing, cancellation, and returns policy prior to completing your purchase.
        </p>
      </div>

      {/* Prominent Policy Alert Banner */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-neutral-800 dark:text-neutral-200 space-y-2">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            Final Sale Notice &amp; Direct Dropshipping Fulfillment
          </h2>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed pl-8">
          All orders placed on <strong>{SITE_CONFIG.brandName}</strong> are strictly <strong>FINAL SALE</strong>. Due to our automated direct-to-supplier dispatch architecture, orders cannot be cancelled, modified, returned, or refunded once payment is captured.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-8">
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <Ban className="w-4 h-4 text-brand-gold shrink-0" />
            <h3>1. Strict No Return &amp; No Cancellation Policy</h3>
          </div>
          <p>
            When you complete a checkout on {SITE_CONFIG.brandName}, our system instantly communicates with our payment gateway (Cashfree) to capture the transaction. Upon verification, the order data is instantly and automatically transmitted via secure API to our third-party fulfillment partner for automated packing and carrier dispatch.
          </p>
          <p>
            Because order allocation occurs in real-time within automated supply chain facilities, <strong>we do not accept order cancellations, order revisions, product returns, or exchanges</strong> under any circumstance once payment has been authorized. Please ensure all sizing, color variants, quantities, and destination addresses are correct before confirming your payment.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <Truck className="w-4 h-4 text-brand-gold shrink-0" />
            <h3>2. Dropshipping Model &amp; Non-Ownership of Goods</h3>
          </div>
          <p>
            {SITE_CONFIG.brandName} operates as an independent, curated dropshipping platform. We do not manufacture, design, warehouse, or physically inspect inventory. Products offered on our website are fulfilled and dispatched directly from third-party global suppliers and manufacturer warehouses (including CJ Dropshipping).
          </p>
          <p>
            Title and risk of loss for all merchandise pass directly from the third-party manufacturer or shipping carrier to the customer upon dispatch from the fulfillment facility.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-brand-gold shrink-0" />
            <h3>3. Product Quality, Defect &amp; Liability Disclaimer</h3>
          </div>
          <p>
            Because {SITE_CONFIG.brandName} acts solely as an intermediary dropshipping facilitator, neither this website, its corporate entities, nor its management are responsible or liable for any product defects, manufacturing flaws, material imperfections, transit damages, or variations from displayed images.
          </p>
          <p>
            All products are provided strictly on an &ldquo;as is&rdquo; and &ldquo;as supplied&rdquo; basis by third-party suppliers. To the maximum extent permitted by applicable law, {SITE_CONFIG.brandName} and its management expressly disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <Mail className="w-4 h-4 text-brand-gold shrink-0" />
            <h3>4. Shipment Tracking &amp; Inquiries</h3>
          </div>
          <p>
            Once an order is dispatched by the supplier, live carrier tracking information is automatically assigned and made available to you via our{" "}
            <Link href="/track-order" className="text-brand-gold underline font-medium">
              Track Order
            </Link>{" "}
            portal.
          </p>
          <p>
            For questions regarding carrier telemetry, delivery updates, or shipping inquiries, please contact our team at:
          </p>
          <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
            <strong>Official Contact Email:</strong>{" "}
            <a
              href="mailto:mychoiceteam.com@gmail.com"
              className="text-brand-gold underline hover:text-amber-400"
            >
              mychoiceteam.com@gmail.com
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
