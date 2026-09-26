"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { SupportedCurrency, SITE_CONFIG } from "@/lib/config/site";
import { CURRENCY_METADATA } from "@/lib/currency";

export function CurrencySelector({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Select currency"
      >
        <Globe className="w-3.5 h-3.5 text-neutral-400" />
        <span>{currency}</span>
        <span className="text-neutral-400 text-[11px]">({CURRENCY_METADATA[currency].symbol.trim()})</span>
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-1.5 z-50 animate-slide-down">
          <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
            Regional Currency
          </div>
          {SITE_CONFIG.currencies.supported.map((code) => {
            const meta = CURRENCY_METADATA[code];
            const isSelected = currency === code;
            return (
              <button
                key={code}
                onClick={() => {
                  setCurrency(code as SupportedCurrency);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-950 dark:text-white font-semibold"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                }`}
              >
                <span>{meta.name}</span>
                <span className="font-mono text-neutral-400 font-normal">{code} ({meta.symbol.trim()})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
