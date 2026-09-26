"use client";

import React, { useState } from "react";
import {
  Settings,
  Shield,
  CreditCard,
  Mail,
  Activity,
  Save,
  CheckCircle2,
  Server,
  Database,
  Lock,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/config/site";
import { cjService } from "@/lib/cj";
import { isSupabaseConfigured } from "@/lib/db/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const [brandName, setBrandName] = useState(SITE_CONFIG.brandName);
  const [tagline, setTagline] = useState(SITE_CONFIG.tagline);
  const [supportEmail, setSupportEmail] = useState(SITE_CONFIG.contact.email);
  const [supportPhone, setSupportPhone] = useState(SITE_CONFIG.contact.phone);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    SITE_CONFIG.thresholds.freeShippingUsd
  );
  const [minimumMargin, setMinimumMargin] = useState(
    SITE_CONFIG.thresholds.minimumMarginPercent
  );

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDbConfigured = isSupabaseConfigured();
  const cjStatus = cjService.getStatus();

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Storefront Settings &amp; Infrastructure
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Global business parameters, margin rules, and infrastructure health.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          leftIcon={saved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
        >
          {saved ? "Settings Saved" : "Save Changes"}
        </Button>
      </div>

      {/* System Health Dashboard */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-gold" />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
            System &amp; Infrastructure Health Matrix
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">Database &amp; RLS</span>
            <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {isDbConfigured ? "Supabase Live" : "Local / Zero-Config"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">CJdropshipping API</span>
            <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {cjStatus}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">Payments Provider</span>
            <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sandbox Adapter Ready
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-bold block">Security &amp; RLS</span>
            <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Hardened (26 Tables)
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
        {/* Brand Information */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Brand &amp; Legal Identity
          </h3>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Storefront Brand Name
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-semibold"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Brand Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Concierge Support Email
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Support Phone
            </label>
            <input
              type="text"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>
        </div>

        {/* Commerce Rules */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Commerce &amp; Margin Rules
          </h3>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Free Shipping Order Threshold ($)
            </label>
            <input
              type="number"
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Customers above this cart subtotal automatically receive free express shipping.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Minimum Required Profit Margin (%)
            </label>
            <input
              type="number"
              value={minimumMargin}
              onChange={(e) => setMinimumMargin(Number(e.target.value))}
              className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-bold"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Triggers visual margin warnings in the product editor if unit net profit falls below this percent.
            </p>
          </div>

          <div className="pt-2">
            <span className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Supported Regional Currencies
            </span>
            <div className="flex flex-wrap gap-2">
              {SITE_CONFIG.currencies.supported.map((cur) => (
                <Badge key={cur} variant="default" className="font-mono">
                  {cur}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
