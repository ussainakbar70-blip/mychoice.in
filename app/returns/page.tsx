import React from "react";
import type { Metadata } from "next";
import { RotateCcw, CheckCircle2, ShieldAlert } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Returns & Exchanges Policy",
  description: "30-day effortless returns, concierge exchange protocol, and refund details.",
};

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          Client Guarantee
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Returns &amp; Exchanges
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
          We stand behind the craftsmanship of every essential. If an item fails to meet your expectations,
          we provide simple 30-day returns.
        </p>
      </div>

      <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white">
          30-Day Return Window
        </h2>
        <p>
          You may request a return within 30 days of receiving your shipment. To be eligible,
          items must be returned in their original packaging, unused, and with all accessories included.
        </p>

        <h2 className="text-base font-bold text-neutral-900 dark:text-white">
          Concierge Return Process
        </h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Contact our concierge team at <strong className="text-neutral-900 dark:text-white">{SITE_CONFIG.contact.email}</strong> with your order reference number (e.g. ORD-2026-10001).</li>
          <li>Our team will generate a prepaid return authorization label.</li>
          <li>Once received and inspected at our logistics center, your refund will be issued to your original payment method within 3 business days.</li>
        </ol>
      </div>
    </div>
  );
}
