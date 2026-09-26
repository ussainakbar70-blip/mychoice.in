"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { dbStore, StoredOrder } from "@/lib/db/client";
import { DEMO_PRODUCTS, CATEGORIES } from "@/lib/db/seed-data";
import { formatMoney } from "@/lib/currency";
import { cjService } from "@/lib/cj";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [cjStatus, setCjStatus] = useState<string>("Checking...");

  useEffect(() => {
    setOrders(dbStore.getAllOrders());
    setCjStatus(cjService.getStatus());
  }, []);

  const totalSales = orders.reduce((acc, o) => acc + (o.paymentStatus === "paid" ? o.totalAmount : 0), 0);
  const pendingFulfillmentCount = orders.filter((o) =>
    ["pending_sync", "unfulfilled", "awaiting_cj_payment"].includes(o.fulfillmentStatus)
  ).length;

  const lowStockProducts = DEMO_PRODUCTS.filter((p) =>
    p.variants.some((v) => v.inventoryQuantity < 50)
  );

  return (
    <div className="space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Operations Executive Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time telemetry across revenue, fulfillment queue, and CJdropshipping API v2.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={cjStatus === "Connected" ? "success" : "gold"}>
            CJ Status: {cjStatus}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOrders(dbStore.getAllOrders())}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Gross Sales</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatMoney(totalSales, "USD")}
          </div>
          <p className="text-[11px] text-neutral-400">Authoritative database verified totals</p>
        </div>

        {/* Total Orders */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Total Orders</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {orders.length}
          </div>
          <p className="text-[11px] text-neutral-400">Lifetime customer checkouts</p>
        </div>

        {/* Pending Fulfillment */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Pending Fulfillment</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {pendingFulfillmentCount}
          </div>
          <p className="text-[11px] text-neutral-400">Awaiting CJ sync or balance confirmation</p>
        </div>

        {/* Active Catalog SKUs */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Published SKUs</span>
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {DEMO_PRODUCTS.length}
          </div>
          <p className="text-[11px] text-neutral-400">Across 8 curated collections</p>
        </div>
      </div>

      {/* Split Row: Recent Orders Table & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders Table (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Recent Orders</h2>
              <p className="text-[11px] text-neutral-500">Live order queue synced with CJ fulfillment</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-brand-gold hover:underline inline-flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No orders placed yet. Simulate an order through customer storefront checkout.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-semibold">
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3">Fulfillment</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 font-mono font-semibold text-neutral-900 dark:text-white">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 text-neutral-600 dark:text-neutral-400">
                        {ord.shippingAddress.fullName}
                      </td>
                      <td className="py-3 font-semibold text-neutral-900 dark:text-white">
                        {formatMoney(ord.totalAmount, "USD")}
                      </td>
                      <td className="py-3">
                        <Badge variant={ord.paymentStatus === "paid" ? "success" : "warning"}>
                          {ord.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant="default" className="capitalize">
                          {ord.fulfillmentStatus.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/orders`}
                          className="font-semibold text-brand-gold hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock & System Indicators (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Low Stock Watch */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Inventory Watch</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Variants with inventory below the 50-unit threshold.
            </p>

            <div className="space-y-3 pt-1">
              {lowStockProducts.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50 dark:bg-neutral-850"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate">{p.name}</p>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {p.variants[0]?.sku}
                    </span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {p.variants[0]?.inventoryQuantity} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick CJ Actions Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-neutral-900 dark:text-white">Direct Integrations</h3>
            <p className="text-neutral-500 leading-relaxed">
              Explore CJ catalog items, import drafts with automated pricing formulas, and inspect webhook logs.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <Link href="/admin/cj/products" className="w-full flex justify-between items-center">
                  <span>Import CJ Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <Link href="/admin/integrations/cj" className="w-full flex justify-between items-center">
                  <span>CJ Health Diagnostics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
