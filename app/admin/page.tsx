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
  Users,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { getAdminMetrics, AdminMetrics } from "@/lib/admin";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getAdminMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Store Operations Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Authoritative, real-time database telemetry across sales, fulfillment, customers, and inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Real Revenue */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Verified Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatMoney(metrics?.totalRevenue || 0, "USD")}
          </div>
          <p className="text-[11px] text-neutral-400">
            {metrics?.paidOrdersCount || 0} paid order(s) confirmed
          </p>
        </div>

        {/* Total Orders */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Total Checkouts</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics?.totalOrders || 0}
          </div>
          <p className="text-[11px] text-neutral-400">Lifetime database recorded orders</p>
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
            {metrics?.pendingFulfillmentCount || 0}
          </div>
          <p className="text-[11px] text-neutral-400">Awaiting packaging or dispatch</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Low Stock Alerts</span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {metrics?.lowStockCount || 0}
          </div>
          <p className="text-[11px] text-neutral-400">Variants below threshold</p>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
        <div>
          <span className="text-neutral-400 block">Registered Customers</span>
          <strong className="text-base font-bold text-neutral-900 dark:text-white">
            {metrics?.totalCustomers || 0}
          </strong>
        </div>
        <div>
          <span className="text-neutral-400 block">Catalog Products</span>
          <strong className="text-base font-bold text-neutral-900 dark:text-white">
            {metrics?.totalProducts || 0}
          </strong>
        </div>
        <div>
          <span className="text-neutral-400 block">Shipped / In Transit</span>
          <strong className="text-base font-bold text-neutral-900 dark:text-white">
            {metrics?.shippedOrdersCount || 0}
          </strong>
        </div>
        <div>
          <span className="text-neutral-400 block">Completed Deliveries</span>
          <strong className="text-base font-bold text-neutral-900 dark:text-white">
            {metrics?.deliveredOrdersCount || 0}
          </strong>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Recent Orders</h2>
            <p className="text-xs text-neutral-400">Live feed of orders placed by customers</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/orders" className="inline-flex items-center gap-1.5">
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        {metrics && metrics.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Customer Email</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Fulfillment</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {metrics.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                    <td className="py-3 px-3 font-mono font-bold text-neutral-900 dark:text-white">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300">
                      {o.email}
                    </td>
                    <td className="py-3 px-3 text-neutral-500">
                      {o.items.length} item(s)
                    </td>
                    <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white">
                      {formatMoney(o.totalAmount, "USD")}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={o.paymentStatus === "paid" ? "success" : "neutral"} size="sm">
                        {o.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="blue" size="sm">
                        {o.fulfillmentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="text-brand-gold hover:underline font-semibold"
                      >
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-neutral-400 space-y-1">
            <ShoppingCart className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700" />
            <p>No orders recorded in the database yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
