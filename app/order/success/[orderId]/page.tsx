"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckCircle2, Truck, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { getOrderSecure, DetailedOrder } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/currency";
import { useCart } from "@/lib/cart/context";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface OrderSuccessDynamicProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderSuccessDynamicPage({ params }: OrderSuccessDynamicProps) {
  const resolvedParams = use(params);
  const orderIdentifier = resolvedParams.orderId;
  const { currency, clearCart } = useCart();

  const [order, setOrder] = useState<DetailedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear cart once order is confirmed
    clearCart();

    async function loadConfirmedOrder() {
      const user = await getCurrentUser();
      const found = await getOrderSecure(orderIdentifier, {
        customerId: user?.id,
        email: user?.email,
        isAdmin: user?.role === "admin",
      });
      setOrder(found);
      setLoading(false);
    }

    loadConfirmedOrder();
  }, [orderIdentifier, clearCart]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-neutral-400">
        Validating order confirmation...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <Badge variant="success">Order Placed Successfully</Badge>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Thank you for choosing MYCHOICE.
        </h1>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          Your order has been recorded. A confirmation receipt has been dispatched to your email address.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 font-mono text-sm font-semibold text-neutral-900 dark:text-white">
          <span>Order Number:</span>
          <strong className="text-brand-gold">{order?.orderNumber || orderIdentifier}</strong>
        </div>
      </div>

      {order && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Payment Status</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 capitalize">
                {order.paymentStatus}
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Fulfillment Pipeline</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5 capitalize">
                {order.fulfillmentStatus.replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <span className="text-xs text-neutral-400 uppercase font-semibold">Destination</span>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
                {order.shippingAddress.city}, {order.shippingAddress.country}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold text-neutral-400">Purchased Essentials</h4>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {item.productName}
                    </span>
                    {item.variantName && (
                      <span className="text-neutral-400 block text-xs">{item.variantName}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatMoney(item.unitPrice * item.quantity, currency)}
                    </span>
                    <span className="text-xs text-neutral-400 block">
                      Qty {item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850 flex justify-between items-center text-sm">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">Total Authorized Amount</span>
            <span className="text-lg font-bold text-neutral-900 dark:text-white">
              {formatMoney(order.totalAmount, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Next Steps & CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Button variant="primary" size="md" asChild>
          <Link href="/shop" className="inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </Button>
        <Button variant="outline" size="md" asChild>
          <Link href="/account/orders" className="inline-flex items-center gap-2">
            <span>View All Orders</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
