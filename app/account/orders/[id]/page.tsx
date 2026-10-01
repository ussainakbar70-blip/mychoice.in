"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Truck, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOrderSecure, DetailedOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/currency";
import { useCart } from "@/lib/cart/context";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderIdOrNumber = resolvedParams.id;
  const router = useRouter();
  const { currency } = useCart();

  const [order, setOrder] = useState<DetailedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadOrder() {
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/login?redirect=/account/orders/${orderIdOrNumber}`);
        return;
      }

      try {
        const found = await getOrderSecure(orderIdOrNumber, {
          customerId: user.id,
          email: user.email,
          isAdmin: user.role === "admin",
        });

        if (!found) {
          setErrorMsg("Order not found or you are not authorized to view this invoice.");
        } else {
          setOrder(found);
        }
      } catch {
        setErrorMsg("Failed to retrieve order details.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderIdOrNumber, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-neutral-400">
        Loading invoice details...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Unable to Display Order</h2>
        <p className="text-xs text-neutral-500">{errorMsg || "Order could not be loaded."}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account/orders">Back to Order History</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Orders</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
              Official Tax Invoice
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
              Order {order.orderNumber}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={order.paymentStatus === "paid" ? "success" : "neutral"}>
              Payment: {order.paymentStatus}
            </Badge>
            <Badge variant="blue">
              Fulfillment: {order.fulfillmentStatus}
            </Badge>
            <Link href={`/account/orders/${order.id}/tracking`}>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-white/20">
                <Truck className="w-3.5 h-3.5" />
                <span>Track Shipment</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-8">
        {/* Purchased Items (Historical Snapshot) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            Purchased Essentials
          </h3>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">
                    {item.productName}
                  </h4>
                  {item.variantName && (
                    <p className="text-xs text-neutral-400">{item.variantName}</p>
                  )}
                  <span className="text-[11px] font-mono text-neutral-400">SKU: {item.sku}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-neutral-900 dark:text-white block">
                    {formatMoney(item.unitPrice * item.quantity, currency)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {item.quantity} × {formatMoney(item.unitPrice, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-4 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-850 space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal, currency)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Savings / Coupon Applied</span>
              <span>-{formatMoney(order.discountAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>Shipping</span>
            <span>{order.shippingAmount === 0 ? "Complimentary" : formatMoney(order.shippingAmount, currency)}</span>
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Estimated Tax</span>
              <span>{formatMoney(order.taxAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2.5 border-t border-neutral-200 dark:border-neutral-700 text-base font-bold text-neutral-900 dark:text-white">
            <span>Grand Total</span>
            <span className="text-brand-gold">{formatMoney(order.totalAmount, currency)}</span>
          </div>
        </div>

        {/* Delivery Address & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Delivery Destination</span>
            </h4>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong className="text-neutral-900 dark:text-white block font-medium">
                {order.shippingAddress.fullName}
              </strong>
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country} • {order.shippingAddress.phone}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
              <span>Dispatch Guarantee</span>
            </h4>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-300 space-y-1.5">
              <p>
                <strong>Tracking Reference:</strong>{" "}
                {order.trackingNumber ? (
                  <span className="font-mono text-brand-gold">{order.trackingNumber}</span>
                ) : (
                  <span className="text-neutral-400">Allocating upon carrier handover</span>
                )}
              </p>
              <p className="text-[11px] text-neutral-400">
                All shipments are fully insured against transit loss or damage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
