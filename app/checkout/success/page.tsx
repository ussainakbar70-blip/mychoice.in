"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Truck, ArrowRight, ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatUSD } from "@/lib/payments/money";
import { trackVerifiedPurchase } from "@/lib/analytics";

interface OrderData {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  fulfillmentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productName: string;
    variantName?: string;
    quantity: number;
    totalPrice: number;
  }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") || searchParams.get("order_id");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    fetch(`/api/orders?order_number=${orderNumber}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
          // Fire purchase analytics ONLY after verified payment is confirmed from backend
          if (!trackedRef.current && (data.order.paymentStatus === "paid" || data.order.payment_status === "paid")) {
            trackedRef.current = true;
            trackVerifiedPurchase({
              orderNumber: data.order.orderNumber,
              total: data.order.totalAmount,
              currency: data.order.currency,
              itemCount: data.order.items?.length || 1,
            });
          }
        }
      })
      .catch((err) => console.error("Error loading order summary:", err))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      {/* Success Badge & Headline */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="flex items-center justify-center gap-2">
          <Badge variant="success">Payment Verified</Badge>
          <Badge variant="outline">Order Confirmed</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Payment Confirmed
        </h1>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          Thank you for choosing MYCHOICE.in. Your payment has been securely verified and your order has been queued for express fulfillment.
        </p>

        {orderNumber && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 font-mono text-sm font-semibold text-neutral-900 dark:text-white">
            <span>Order Reference:</span>
            <strong className="text-brand-gold">{orderNumber}</strong>
          </div>
        )}
      </div>

      {/* Order Details Card */}
      {order && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 text-xs">
            <div>
              <span className="text-neutral-400 uppercase font-semibold">Payment Status</span>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 capitalize flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {order.paymentStatus === "paid" ? "Verified & Paid" : order.paymentStatus}
              </p>
            </div>
            <div>
              <span className="text-neutral-400 uppercase font-semibold">Estimated Delivery</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-brand-gold" />
                5–9 Business Days (Tracked)
              </p>
            </div>
            <div>
              <span className="text-neutral-400 uppercase font-semibold">Shipping Destination</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                {order.shippingAddress.city}, {order.shippingAddress.country}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">
                    {item.productName}
                  </h4>
                  {item.variantName && <p className="text-neutral-500">{item.variantName}</p>}
                  <p className="text-neutral-400 text-[11px]">Qty: {item.quantity}</p>
                </div>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {formatUSD(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Total Paid</span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {formatUSD(order.totalAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {orderNumber && (
          <Button variant="primary" size="lg" asChild>
            <Link href={`/track-order?order_number=${orderNumber}`} className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Track Your Order
            </Link>
          </Button>
        )}
        <Button variant="outline" size="lg" asChild>
          <Link href="/shop" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Suspense fallback={<div className="p-20 text-center text-xs text-neutral-400">Loading order receipt...</div>}>
        <CheckoutSuccessContent />
      </Suspense>
    </div>
  );
}
