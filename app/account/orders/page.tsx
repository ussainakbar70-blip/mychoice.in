"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ArrowLeft, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerOrders, DetailedOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/currency";
import { useCart } from "@/lib/cart/context";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AccountOrdersPage() {
  const router = useRouter();
  const { currency } = useCart();
  const [orders, setOrders] = useState<DetailedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login?redirect=/account/orders");
        return;
      }

      const list = await getCustomerOrders({ customerId: user.id, email: user.email });
      setOrders(list);
      setLoading(false);
    }

    loadOrders();
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <div>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Account Overview</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Order History ({orders.length})
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs text-neutral-400">Loading order history...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-850">
                <div>
                  <span className="text-xs uppercase font-bold text-neutral-400">Order Reference</span>
                  <p className="text-base font-mono font-bold text-neutral-900 dark:text-white mt-0.5">
                    {order.orderNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.paymentStatus === "paid" ? "success" : "neutral"}>
                    Payment: {order.paymentStatus}
                  </Badge>
                  <Badge variant="blue">
                    Fulfillment: {order.fulfillmentStatus}
                  </Badge>
                </div>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        {item.productName}
                      </h4>
                      {item.variantName && (
                        <p className="text-neutral-400 text-[11px]">{item.variantName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {formatMoney(item.unitPrice * item.quantity, currency)}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Qty {item.quantity} × {formatMoney(item.unitPrice, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <span className="text-neutral-500">
                  Placed on {new Date(order.createdAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-4">
                  <strong className="text-sm font-bold text-neutral-900 dark:text-white">
                    Total: {formatMoney(order.totalAmount, currency)}
                  </strong>
                  <Button variant="primary" size="sm" asChild>
                    <Link href={`/account/orders/${order.orderNumber}`}>
                      <span>View Invoice</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 space-y-3">
          <Package className="w-10 h-10 text-neutral-400 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">No Orders Placed Yet</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Once you place an order, your tracking details and receipts will appear here.
          </p>
          <Button variant="primary" size="sm" asChild>
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
