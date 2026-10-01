"use client";

import React from "react";

/**
 * Currency Indicator Badge
 * Demonstrates that MYCHOICE.in is strictly a US Dollar ($ USD) store.
 * No other currencies are permitted or displayed.
 */
export function CurrencySelector({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700/60 select-none ${className}`}
      title="All store pricing and transactions are exclusively in US Dollars ($ USD)"
    >
      <span className="text-brand-gold font-bold">$</span>
      <span>USD</span>
    </div>
  );
}
