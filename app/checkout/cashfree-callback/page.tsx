"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { Button } from "@/components/ui/Button";

function CashfreeCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const rawStatus = searchParams.get("order_status") || searchParams.get("txStatus");
  const { clearCart } = useCart();
  const [statusMessage, setStatusMessage] = useState("Verifying payment status with Cashfree...");
  const [isError, setIsError] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const verifyCashfreeReturn = useCallback(async () => {
    if (!orderId) {
      setIsVerifying(false);
      setIsError(true);
      setStatusMessage("Missing order reference in payment gateway callback.");
      return;
    }

    if (rawStatus === "CANCELLED" || rawStatus === "USER_DROPPED") {
      setIsVerifying(false);
      setIsError(true);
      const reason = "Payment was cancelled or dismissed before completion.";
      setStatusMessage(reason);
      router.replace(
        `/checkout/payment-failed?order_number=${orderId}&reason=${encodeURIComponent(reason)}`
      );
      return;
    }

    setIsVerifying(true);
    setIsPending(false);
    setIsError(false);
    setStatusMessage("Connecting to Cashfree to confirm transaction...");

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          providerOrderId: orderId,
          providerPaymentId: orderId,
          providerSignature: "cf_redirect_callback",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        clearCart();
        setIsVerifying(false);
        setStatusMessage("Payment confirmed! Redirecting to your order receipt...");
        router.replace(data.redirectUrl || `/checkout/success?order_number=${data.orderNumber || orderId}`);
      } else if (data.status === "pending") {
        setIsVerifying(false);
        setIsPending(true);
        setStatusMessage(data.error || "Payment confirmation is still processing with your bank or UPI provider.");
      } else {
        setIsVerifying(false);
        setIsError(true);
        const reason = data.error || "Payment verification could not be completed.";
        setStatusMessage(reason);
        router.replace(
          `/checkout/payment-failed?order_number=${orderId}&reason=${encodeURIComponent(reason)}`
        );
      }
    } catch (err: unknown) {
      setIsVerifying(false);
      setIsError(true);
      const reason = err instanceof Error ? err.message : "Network error during verification";
      setStatusMessage(reason);
      router.replace(
        `/checkout/payment-failed?order_number=${orderId}&reason=${encodeURIComponent(reason)}`
      );
    }
  }, [orderId, rawStatus, clearCart, router]);

  useEffect(() => {
    verifyCashfreeReturn();
  }, [verifyCashfreeReturn]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full p-8 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center space-y-5 shadow-sm">
        {isPending ? (
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
        ) : isError ? (
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-base font-bold text-neutral-900 dark:text-white">
            {isPending ? "Payment Pending Confirmation" : isError ? "Payment Incomplete" : "Processing Gateway Response"}
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {statusMessage}
          </p>
        </div>

        {isPending && (
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={verifyCashfreeReturn}
              isLoading={isVerifying}
              className="w-full text-xs"
            >
              Re-check Status
            </Button>
            <Button variant="outline" size="sm" asChild className="w-full text-xs">
              <Link href="/track-order">Track Order Manually</Link>
            </Button>
          </div>
        )}

        {isError && !orderId && (
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" size="sm" asChild className="w-full text-xs">
              <Link href="/checkout">Return to Checkout</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="w-full text-xs">
              <Link href="/cart">Review Cart</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CashfreeCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Connecting to Cashfree...</span>
          </div>
        </div>
      }
    >
      <CashfreeCallbackContent />
    </Suspense>
  );
}
