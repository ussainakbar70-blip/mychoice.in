import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | MYCHOICE.in",
  description: "How MYCHOICE.in protects personal data, shares fulfillment telemetry with dropshipping partners, and handles user privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Last Updated: October 2026</p>
      </div>

      <div className="space-y-8 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">1. Dropshipping Platform Architecture &amp; Data Role</h2>
          <p>
            {SITE_CONFIG.brandName} operates as an independent curated dropshipping platform. We do not manufacture, warehouse, inspect, or own physical inventory. Products presented on this platform are stored and dispatched directly by third-party global manufacturers, suppliers, and fulfillment networks (including CJ Dropshipping).
          </p>
          <p>
            In our capacity as a dropshipping intermediary, our primary processing of personal information is designed to facilitate secure payments and relay order dispatch information to the external logistics entities responsible for packaging and delivering your goods.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">2. Personal Information Collected</h2>
          <p>
            When you complete an order or register on our website, we collect information necessary to execute the purchase:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600 dark:text-neutral-400">
            <li><strong>Recipient Details:</strong> Full name, delivery destination address, postal code, and contact telephone number.</li>
            <li><strong>Account Telemetry:</strong> Email address for order confirmation receipts, dispatch notifications, and carrier tracking links.</li>
            <li><strong>Transaction Telemetry:</strong> Order identifiers, purchased variant details, and authoritative payment status tokens. Payment processing is handled by certified PCI-DSS compliant providers (Cashfree Payments); we never store your credit card or bank account credentials.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">3. Third-Party Fulfillment Telemetry &amp; Data Transmission</h2>
          <p>
            To fulfill your orders, customer shipping details (name, shipping address, contact phone, and ordered line items) are transmitted via encrypted TLS connections directly to our third-party dropshipping suppliers (including CJ Dropshipping) and designated courier services.
          </p>
          <p>
            These third-party fulfillment partners receive this telemetry solely for the purpose of printing shipping labels, packaging items, and orchestrating carrier dispatch to your destination.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">4. Automated Dispatch &amp; Final Sale Policy Disclosure</h2>
          <p>
            Due to our automated dropshipping pipeline, order data is routed to fulfillment partner facilities immediately upon payment authorization. Consequently, orders cannot be intercepted, cancelled, or amended once placed, and all sales are final. Our platform does not accept returns, refunds, or product cancellations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">5. Product Defects &amp; Non-Responsibility Disclaimer</h2>
          <p>
            Because this platform operates as a dropshipping intermediary and does not manufacture, assemble, or possess physical goods, {SITE_CONFIG.brandName}, its operating entities, and its management are not responsible, liable, or responsive for any product defects, faults, transit damage, or variances in items delivered by third-party suppliers.
          </p>
          <p>
            Any claims regarding product manufacturing or quality must be directed to the underlying manufacturer. Customers acknowledge that our role is strictly limited to order coordination and dropshipping facilitation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">6. Shipment Tracking Data</h2>
          <p>
            We collect carrier checkpoint milestones via automated webhook integrations to keep you informed of transit progress. You can review your shipment status anytime using our{" "}
            <Link href="/track-order" className="text-brand-gold underline font-medium">
              Track Order
            </Link>{" "}
            service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">7. Contact &amp; Privacy Officer</h2>
          <p>
            If you have any questions regarding this Privacy Policy, your personal data, or our dropshipping disclosures, please contact us at our official designated address:
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
