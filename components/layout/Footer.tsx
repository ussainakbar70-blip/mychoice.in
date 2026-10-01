"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Truck, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { CATEGORIES } from "@/lib/db/seed-data";
import { SITE_CONFIG } from "@/lib/config/site";
import { CurrencySelector } from "./CurrencySelector";
import { LanguageSelector } from "./LanguageSelector";

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="bg-neutral-950 text-neutral-400 border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Pillars Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-14 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Global Express Fulfillment</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Direct tracked logistics with end-to-end milestone visibility across 40+ countries.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Verified Craft & Quality</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Every curated SKU undergoes strict physical inspection for material authenticity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Direct Supplier Dispatch</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Automated order routing directly from certified global logistics hubs with live tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 py-14 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="light" showTagline={true} />
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              {SITE_CONFIG.description}
            </p>
            <div className="pt-2 space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300 block mb-1.5">
                  Global Language
                </span>
                <LanguageSelector />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-300 block mb-1.5">
                  Store Currency
                </span>
                <div className="flex items-center gap-2">
                  <CurrencySelector />
                  <span className="text-[11px] text-neutral-400">All prices in US Dollars ($)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Column */}
          <div>
            <h5 className="text-xs uppercase font-bold tracking-widest text-white mb-4">
              Categories
            </h5>
            <ul className="space-y-2.5 text-xs">
              {CATEGORIES.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="hover:text-white transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="text-brand-gold hover:underline font-medium">
                  View All 8 Categories &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Concierge & Policies */}
          <div>
            <h5 className="text-xs uppercase font-bold tracking-widest text-white mb-4">
              Client Concierge
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/track-order" className="hover:text-white transition-colors">
                  Track Your Shipment
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-white transition-colors">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-white transition-colors">
                  Return &amp; Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h5 className="text-xs uppercase font-bold tracking-widest text-white mb-4">
              The Journal
            </h5>
            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Receive private preview access to limited product drops and editorial essays.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 p-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You are on the private access registry.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-brand-gold"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 p-1.5 rounded-md bg-white text-neutral-950 hover:bg-neutral-200 transition-colors"
                    aria-label="Subscribe"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  No promotional spam. You can unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.brandName}. All rights reserved.</p>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Secure 256-Bit SSL Encrypted Checkout</span>
            <span className="hidden md:inline">•</span>
            <Link href="/admin" className="hover:text-neutral-300">
              Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
