import React from "react";
import type { Metadata } from "next";
import { Truck, Clock, ShieldCheck, Globe } from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Shipping & Worldwide Delivery Policy",
  description: "Transparent international logistics timelines, customs, and tracking information.",
};

export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          Delivery Policy
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Shipping &amp; Logistics
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto">
          Every shipment includes door-to-door tracked transit across India, North America, Europe, and the Middle East.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <Truck className="w-5 h-5 text-brand-gold" />
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Complimentary Tier</h3>
          <p className="text-xs text-neutral-500">
            Free tracked express delivery on all orders exceeding ${SITE_CONFIG.thresholds.freeShippingUsd}.00 USD.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <Clock className="w-5 h-5 text-brand-gold" />
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Delivery Window</h3>
          <p className="text-xs text-neutral-500">
            Standard tracked express orders arrive in 5 to 9 business days depending on destination customs clearance.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <Globe className="w-5 h-5 text-brand-gold" />
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Live Telemetry</h3>
          <p className="text-xs text-neutral-500">
            Real-time checkpoint tracking provided from dispatch to arrival via our portal or carrier tracking.
          </p>
        </div>
      </div>

      <div className="space-y-6 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-t border-neutral-200 dark:border-neutral-800 pt-8">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white">
          Processing &amp; Dispatch Timeline
        </h2>
        <p>
          Orders placed Monday through Friday before 2:00 PM are verified and pushed to our fulfillment
          pipeline within 24 business hours. You will receive an automated dispatch notification containing
          your official tracking reference number once courier handoff is registered.
        </p>

        <h2 className="text-base font-bold text-neutral-900 dark:text-white">
          Duties &amp; Import Clearance
        </h2>
        <p>
          All domestic deliveries within India (via our canonical .in destination network) and international shipments
          are handled through express channels with standard paperwork attached to expedite clearance.
        </p>
      </div>
    </div>
  );
}
