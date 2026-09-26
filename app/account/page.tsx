"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, Package, MapPin, Heart, LogOut, ArrowRight, ShieldCheck } from "lucide-react";
import { dbStore } from "@/lib/db/client";
import { formatMoney } from "@/lib/currency";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";
import { ProductCard } from "@/components/product/ProductCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "addresses" | "wishlist">("overview");

  // In local/demo mode, fetch recent orders from the store
  const allOrders = dbStore.getAllOrders();
  const wishlistProducts = DEMO_PRODUCTS.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
            Client Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
            My Account
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
            <span>Switch to Admin View</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Nav (3 Cols) */}
        <div className="lg:col-span-3 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Account Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "orders"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4" />
              <span>Order History</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              {allOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "addresses"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Saved Addresses</span>
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "wishlist"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4" />
              <span>Wishlist</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
              {wishlistProducts.length}
            </span>
          </button>
        </div>

        {/* Right Tab Content (9 Cols) */}
        <div className="lg:col-span-9">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Welcome to MYCHOICE
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    Manage your orders, shipment telemetry, and saved destinations.
                  </p>
                </div>
                <Badge variant="gold">VIP Client Tier</Badge>
              </div>

              {/* Recent Orders Overview */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-semibold text-brand-gold hover:underline"
                  >
                    View All
                  </button>
                </div>

                {allOrders.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 text-center text-xs text-neutral-500">
                    No orders placed yet. Explore our curated collections.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allOrders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-mono font-semibold text-neutral-900 dark:text-white block">
                            {order.orderNumber}
                          </span>
                          <span className="text-neutral-400">
                            {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="capitalize">
                            {order.fulfillmentStatus.replace(/_/g, " ")}
                          </Badge>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {formatMoney(order.totalAmount, "USD")}
                          </span>
                          <Link
                            href={`/track-order?order_number=${order.orderNumber}`}
                            className="text-brand-gold hover:underline font-semibold"
                          >
                            Track &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                All Orders ({allOrders.length})
              </h2>
              {allOrders.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500">
                  No orders recorded in this session.
                </div>
              ) : (
                <div className="space-y-4">
                  {allOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div>
                          <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                            {order.orderNumber}
                          </span>
                          <p className="text-neutral-400 mt-0.5">
                            Placed on {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="success">Payment: {order.paymentStatus}</Badge>
                          <Badge variant="default" className="capitalize">
                            {order.fulfillmentStatus.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>{item.productName} (x{item.quantity})</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {formatMoney(item.totalPrice, "USD")}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <Link
                          href={`/track-order?order_number=${order.orderNumber}`}
                          className="font-semibold text-brand-gold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Track Shipment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          Total: {formatMoney(order.totalAmount, "USD")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Saved Shipping Destinations
              </h2>
              <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-neutral-900 dark:text-white">Primary Residence</span>
                  <Badge variant="gold">Default</Badge>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Aarav Sharma<br />
                  Tower 4, Apt 1204, Highline Enclave<br />
                  Bandra West, Mumbai, Maharashtra 400050<br />
                  India • +91 98765 43210
                </p>
              </div>
            </div>
          )}

          {activeTab === "wishlist" && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Saved To Wishlist ({wishlistProducts.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
