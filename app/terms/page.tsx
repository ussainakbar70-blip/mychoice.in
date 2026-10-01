import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config/site";

import { buildBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service | User Agreements & Disclosures",
  description: "Terms governing use of MYCHOICE, purchases, dropshipping fulfillment model, final sale policies, and store guidelines.",
  alternates: {
    canonical: `${SITE_CONFIG.siteUrl}/terms`,
  },
  openGraph: {
    title: `Terms of Service | ${SITE_CONFIG.brandName}`,
    description: "Terms governing use of MYCHOICE, purchases, dropshipping fulfillment, and store guidelines.",
    url: `${SITE_CONFIG.siteUrl}/terms`,
    siteName: SITE_CONFIG.brandName,
    locale: "en_US",
    type: "website",
  },
};

export default function TermsPage() {
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Terms of Service", url: "/terms" },
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Last Updated: October 2026</p>
      </div>

      <div className="space-y-8 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">1. Agreement to Terms</h2>
          <p>
            By accessing or using {SITE_CONFIG.siteUrl} (the &ldquo;Platform&rdquo; or &ldquo;Service&rdquo;), or by purchasing any items through our storefront, you unconditionally agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use or transact on this platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">2. Dropshipping Model &amp; Intermediary Service</h2>
          <p>
            {SITE_CONFIG.brandName} operates strictly as a curated dropshipping e-commerce intermediary platform. We facilitate consumer purchases by connecting buyers with verified third-party global manufacturers, suppliers, and fulfillment facilities (including CJ Dropshipping).
          </p>
          <p>
            {SITE_CONFIG.brandName} and its management do not own, manufacture, store, or physically possess any products offered on this platform. All products are stored, packaged, and shipped directly from independent third-party facilities to the address provided by the customer at checkout.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">3. Payment Processing &amp; Order Confirmation</h2>
          <p>
            Payments are securely collected and processed through our verified payment gateway partners (such as Cashfree Payments). When you place an order (for example, a $29.00 USD curated item or regional equivalent), payment is authorized and captured immediately. 
          </p>
          <p>
            Upon successful payment confirmation, our automated systems instantly transmit the order specifications and recipient delivery details to third-party fulfillment centers for immediate packing and dispatch.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">4. Strict No Return &amp; No Cancellation Policy (Final Sale)</h2>
          <p>
            Due to our automated dropshipping operations and immediate order transmission to international fulfillment logistics centers, <strong>ALL SALES ARE FINAL</strong>.
          </p>
          <p>
            Once an order is placed and payment is captured by our payment provider:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-neutral-600 dark:text-neutral-400">
            <li>Orders cannot be cancelled, modified, or held once processed.</li>
            <li>We do not accept product returns, refunds, or exchanges under any circumstances.</li>
            <li>Customers are solely responsible for ensuring that all product specifications, quantities, and delivery address details are accurate prior to submitting checkout.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">5. Product Defects, Quality &amp; Limitation of Management Liability</h2>
          <p>
            Because all products displayed on {SITE_CONFIG.brandName} are manufactured and supplied directly by independent third parties, neither this website, its operating company, nor its management are responsible or liable for any product defects, flaws, damages, material variations, or courier delays.
          </p>
          <p>
            All goods and services are provided strictly &ldquo;as is&rdquo; without warranties of any kind, whether express, implied, or statutory. To the maximum extent permitted by applicable law, the management and operators of {SITE_CONFIG.brandName} expressly disclaim all liability for any direct, indirect, incidental, punitive, or consequential damages resulting from defective or non-conforming products.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">6. Shipment Tracking &amp; Delivery</h2>
          <p>
            Once a shipment has been processed and handed over to an international or domestic carrier by the third-party supplier, an automated tracking identifier is generated. Customers can track their package at any time via our{" "}
            <Link href="/track-order" className="text-brand-gold underline font-medium">
              Track Order
            </Link>{" "}
            portal. Delivery timelines average 5 to 9 business days but may vary depending on carrier logistics, customs clearance, and regional conditions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">7. Client Inquiries &amp; Official Contact</h2>
          <p>
            For inquiries regarding tracking telemetry, platform terms, or order status verification, please contact our team via our designated official support email:
          </p>
          <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
            <strong>Official Support Email:</strong>{" "}
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
