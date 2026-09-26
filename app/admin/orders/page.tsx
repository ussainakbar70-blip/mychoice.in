"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Package,
  Truck,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
} from "lucide-react";
import { dbStore, StoredOrder } from "@/lib/db/client";
import { formatMoney } from "@/lib/currency";
import { cjService } from "@/lib/cj";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<StoredOrder[]>(dbStore.getAllOrders());
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<StoredOrder | null>(null);

  const handleSyncToCJ = async (order: StoredOrder) => {
    setSyncingOrderId(order.id);
    try {
      const cjProducts = order.items
        .filter((i) => i.cjVariantId)
        .map((i) => ({
          vid: i.cjVariantId!,
          quantity: i.quantity,
        }));

      const res = await cjService.createOrder({
        orderNumber: order.orderNumber,
        shippingCountryCode: order.shippingAddress.countryCode,
        shippingCountry: order.shippingAddress.country,
        shippingProvince: order.shippingAddress.state,
        shippingCity: order.shippingAddress.city,
        shippingAddress: order.shippingAddress.addressLine1,
        shippingCustomerName: order.shippingAddress.fullName,
        shippingZip: order.shippingAddress.postalCode,
        shippingPhone: order.shippingAddress.phone,
        payType: 3,
        products: cjProducts.length > 0 ? cjProducts : [{ vid: "CJ-V-MOCK-VID", quantity: 1 }],
      });

      if (res.code === 200 && res.data?.orderId) {
        dbStore.updateOrder(order.id, {
          cjOrderId: res.data.orderId,
          fulfillmentStatus: "awaiting_cj_payment",
        });
        setOrders(dbStore.getAllOrders());
      }
    } catch (err) {
      console.error("Manual CJ sync failed:", err);
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleMarkShipped = (order: StoredOrder) => {
    const mockTracking = `CJTRK${Date.now().toString().substring(6)}`;
    dbStore.updateOrder(order.id, {
      fulfillmentStatus: "shipped",
      trackingNumber: mockTracking,
      trackingUrl: `https://www.17track.net/en/track?nums=${mockTracking}`,
    });
    setOrders(dbStore.getAllOrders());
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(dbStore.getOrderById(order.id) || null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Order Fulfillment Pipeline
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Audit customer purchases, submit orders to CJdropshipping, and manage tracking numbers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOrders(dbStore.getAllOrders())}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center text-xs text-neutral-500 space-y-2">
            <Package className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">
              No orders currently in queue.
            </p>
            <p>Customer orders placed through the storefront will display here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold bg-neutral-50/50 dark:bg-neutral-850/50">
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Fulfillment Status</th>
                  <th className="p-4">CJ Order Ref</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-neutral-900 dark:text-white">
                      {order.orderNumber}
                      <span className="block font-normal text-[10px] text-neutral-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {order.shippingAddress.fullName}
                      </p>
                      <p className="text-[11px] text-neutral-400">{order.email}</p>
                    </td>

                    <td className="p-4 font-bold text-neutral-900 dark:text-white">
                      {formatMoney(order.totalAmount, "USD")}
                    </td>

                    <td className="p-4">
                      <Badge variant="success">{order.paymentStatus}</Badge>
                    </td>

                    <td className="p-4">
                      <Badge
                        variant={
                          order.fulfillmentStatus === "shipped"
                            ? "success"
                            : order.fulfillmentStatus === "awaiting_cj_payment"
                            ? "gold"
                            : "default"
                        }
                        className="capitalize"
                      >
                        {order.fulfillmentStatus.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-neutral-500">
                      {order.cjOrderId ? (
                        <span className="text-brand-gold font-semibold">{order.cjOrderId}</span>
                      ) : (
                        <span className="text-neutral-400">Not Synced</span>
                      )}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Inspect
                      </Button>

                      {!order.cjOrderId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={syncingOrderId === order.id}
                          onClick={() => handleSyncToCJ(order)}
                          leftIcon={<Send className="w-3 h-3" />}
                        >
                          Sync to CJ
                        </Button>
                      ) : order.fulfillmentStatus !== "shipped" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkShipped(order)}
                          leftIcon={<Truck className="w-3 h-3" />}
                        >
                          Mark Shipped
                        </Button>
                      ) : (
                        <Link
                          href={`/track-order?order_number=${order.orderNumber}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand-gold hover:underline text-[11px]"
                        >
                          <span>Track</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Order Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 animate-slide-down">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">
                  {selectedOrder.orderNumber}
                </span>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Order Inspection
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Line items */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                Line Items ({selectedOrder.items.length})
              </h4>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-48 overflow-y-auto">
                {selectedOrder.items.map((it, i) => (
                  <div key={i} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">{it.productName}</p>
                      {it.variantName && <p className="text-neutral-400">{it.variantName}</p>}
                      <p className="text-[10px] text-neutral-500 font-mono">
                        SKU: {it.sku} • CJ VID: {it.cjVariantId || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatMoney(it.totalPrice, "USD")}</p>
                      <p className="text-neutral-400 text-[11px]">Qty: {it.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 text-xs space-y-1">
              <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[10px] mb-1">
                Recipient Shipping Info
              </h4>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {selectedOrder.shippingAddress.fullName} ({selectedOrder.shippingAddress.phone})
              </p>
              <p className="text-neutral-500">
                {selectedOrder.shippingAddress.addressLine1},{" "}
                {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{" "}
                {selectedOrder.shippingAddress.postalCode}, {selectedOrder.shippingAddress.country}
              </p>
            </div>

            {/* CJ Telemetry */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">CJ Order ID:</span>
                <span className="font-mono font-semibold text-brand-gold">
                  {selectedOrder.cjOrderId || "Awaiting sync"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Tracking Number:</span>
                <span className="font-mono font-semibold">
                  {selectedOrder.trackingNumber || "Pending dispatch"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Fulfillment Pipeline:</span>
                <Badge variant="default" className="capitalize">
                  {selectedOrder.fulfillmentStatus.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {selectedOrder.fulfillmentStatus !== "shipped" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleMarkShipped(selectedOrder)}
                >
                  Mark Shipped with Live Tracking
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
