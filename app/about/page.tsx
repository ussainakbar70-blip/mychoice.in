import React from "react";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config/site";
import { Shield, Sparkles, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "About Our Philosophy",
  description: "The architectural craft, global logistics, and design manifesto behind MYCHOICE.in.",
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-widest font-bold text-brand-gold">
          The Manifesto
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Curated objects of intention.
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          {SITE_CONFIG.description}
        </p>
      </div>

      <div className="rounded-3xl overflow-hidden aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 shadow-xl">
        <img
          src="https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=80"
          alt="MYCHOICE Design Lab"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="space-y-12 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            1. Elimination of the Noise
          </h2>
          <p>
            Modern commerce is flooded with disposable goods designed to break and manufactured urgency
            intended to manipulate. At {SITE_CONFIG.brandName}, we reject countdown clocks, fake reviews,
            and inflated list prices. We select fewer, better items crafted from honest materials.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            2. High-Precision International Supply Chain
          </h2>
          <p>
            By connecting our custom application directly to certified international fulfillment hubs
            via real-time APIs, we eliminate traditional retailer warehousing markups. Every order is inspected,
            carefully packaged in recyclable materials, and routed via tracked express air couriers.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            3. Quiet Longevity
          </h2>
          <p>
            From endoscopic surgical-grade stainless steel to Tuscan vegetable-tanned leathers and
            LFGB-certified platinum silicones, our items are engineered to withstand daily life while
            growing more beautiful with use.
          </p>
        </div>
      </div>
    </div>
  );
}
