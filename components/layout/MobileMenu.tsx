"use client";

import React from "react";
import Link from "next/link";
import { X, ChevronRight, ShoppingBag, ShieldCheck, Truck, HelpCircle } from "lucide-react";
import { CATEGORIES } from "@/lib/db/seed-data";
import { SITE_CONFIG } from "@/lib/config/site";
import { Logo } from "@/components/ui/Logo";
import { CurrencySelector } from "./CurrencySelector";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white dark:bg-neutral-900 shadow-2xl flex flex-col z-50 animate-slide-up">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <Logo />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Section */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-6">
            <span className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
              Curated Collections
            </span>
            <div className="mt-3 space-y-1">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors"
                >
                  <span>{cat.name}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-5 mb-6">
            <span className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
              Explore
            </span>
            <div className="mt-3 space-y-1">
              {SITE_CONFIG.navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between py-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-neutral-500">Currency</span>
              <CurrencySelector />
            </div>
            <Link
              href="/track-order"
              onClick={onClose}
              className="flex items-center gap-2 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <Truck className="w-4 h-4" />
              <span>Track Your Order</span>
            </Link>
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-2 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Management</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-xs text-neutral-500">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            {SITE_CONFIG.brandName}
          </p>
          <p className="text-[11px] mt-0.5">{SITE_CONFIG.tagline}</p>
        </div>
      </div>
    </div>
  );
}
