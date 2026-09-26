"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Truck, ShoppingBag, ArrowRight } from "lucide-react";
import { StoredOrder } from "@/lib/db/client";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") || searchParams.get("order_id");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);

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
        }
      })
      .catch((err) => console.error("Error fetching order:", err))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <Badge variant="success">Order Confirmed</Badge>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Thank you for your order.
        </h1>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          Your order has been recorded and submitted to our fulfillment pipeline.
          A confirmation dispatch email has been sent.
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
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Fulfillment Status</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 capitalize">
                {order.fulfillmentStatus.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Estimated Delivery</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                5–9 Business Days (Tracked Express)
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Delivery To</span>
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
                  {formatMoney(item.totalPrice, "USD")}
                </span>
              </div>
            ))}
          </div>

          {/* Financial summary */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal, "USD")}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span>-{formatMoney(order.discountAmount, "USD")}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500">
              <span>Shipping</span>
              <span>{order.shippingAmount === 0 ? "Complimentary" : formatMoney(order.shippingAmount, "USD")}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-neutral-900 dark:text-white pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span>Total Paid</span>
              <span className="text-brand-gold">{formatMoney(order.totalAmount, "USD")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {orderNumber && (
          <Link href={`/track-order?order_number=${orderNumber}`} className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              <Truck className="w-4 h-4 mr-2" />
              Track Shipment Status
            </Button>
          </Link>
        )}
        <Link href="/shop" className="w-full sm:w-auto">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-neutral-400">Loading order receipt...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
