"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, ShoppingCart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number");
  const reason = searchParams.get("reason") || "The payment transaction could not be completed or was cancelled.";

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center space-y-6">
      {/* Alert Icon */}
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-sm">
        <AlertCircle className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Payment Incomplete
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          {reason}
        </p>
      </div>

      {orderNumber && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          <span>Pending Order Reference:</span>
          <strong>{orderNumber}</strong>
        </div>
      )}

      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto space-y-1">
        <p className="font-semibold text-neutral-700 dark:text-neutral-300">Don&apos;t worry, no funds were captured.</p>
        <p>Your bag items are reserved. You can safely retry payment or try a different payment method.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Button variant="primary" size="lg" asChild>
          <Link href="/checkout" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry Checkout
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/cart" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Review Bag
          </Link>
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <Link href="/contact" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Suspense fallback={<div className="p-20 text-center text-xs text-neutral-400">Loading...</div>}>
        <PaymentFailedContent />
      </Suspense>
    </div>
  );
}
