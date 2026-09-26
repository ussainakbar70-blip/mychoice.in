"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Truck, CheckCircle2, Clock, PackageCheck, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/currency";

interface TimelineStage {
  key: string;
  label: string;
  completed: boolean;
  timestamp?: string;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("order_number") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [stages, setStages] = useState<TimelineStage[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchTracking = async (searchNum: string, searchEmail?: string) => {
    if (!searchNum) return;
    setLoading(true);
    setErrorMessage("");
    try {
      let url = `/api/orders?order_number=${encodeURIComponent(searchNum)}`;
      if (searchEmail) {
        url += `&email=${encodeURIComponent(searchEmail)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Order not found. Please verify your reference number.");
        setOrderData(null);
        return;
      }
      setOrderData(data.order);
      setStages(data.stages || []);
    } catch {
      setErrorMessage("Could not retrieve tracking details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      fetchTracking(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderNumber, email);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
          Shipment Intelligence
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
          Enter your order reference code and confirmation email to inspect live courier telemetry
          and fulfillment progress.
        </p>
      </div>

      {/* Query Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-12 gap-3"
      >
        <div className="sm:col-span-6">
          <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
            Order Reference
          </label>
          <input
            type="text"
            required
            placeholder="e.g. ORD-2026-10001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white uppercase font-mono focus:outline-none"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
            Email (Optional)
          </label>
          <input
            type="email"
            placeholder="e.g. you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={loading}
            className="w-full h-9"
          >
            Track
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tracking Results Card */}
      {orderData && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-8 animate-fade-in">
          {/* Top Order Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <span className="text-[11px] font-mono text-neutral-400">REFERENCE: {orderData.orderNumber}</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">
                Status: <span className="capitalize">{orderData.fulfillmentStatus.replace(/_/g, " ")}</span>
              </h2>
            </div>
            {orderData.trackingNumber && (
              <div className="text-right">
                <span className="text-xs text-neutral-400 block">Courier Tracking:</span>
                <a
                  href={orderData.trackingUrl || `https://www.17track.net/en/track?nums=${orderData.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-brand-gold hover:underline"
                >
                  <span>{orderData.trackingNumber}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Visual Milestone Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400">
              Shipment Milestones
            </h3>
            <div className="relative pl-6 space-y-6 border-l-2 border-neutral-200 dark:border-neutral-800 ml-3">
              {stages.map((stage) => (
                <div key={stage.key} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                      stage.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                    } flex items-center justify-center`}
                  >
                    {stage.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>

                  <div>
                    <h4
                      className={`text-xs font-semibold ${
                        stage.completed
                          ? "text-neutral-900 dark:text-white"
                          : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {stage.label}
                    </h4>
                    {stage.completed && stage.timestamp && (
                      <span className="text-[11px] text-neutral-400">
                        Recorded on {new Date(stage.timestamp).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Destination & Ordered Items */}
          <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Delivery Address</h4>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {orderData.shippingAddress.fullName}<br />
                {orderData.shippingAddress.addressLine1}<br />
                {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.postalCode}<br />
                {orderData.shippingAddress.country}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Package Contents</h4>
              <div className="space-y-1.5">
                {orderData.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-neutral-600 dark:text-neutral-400">
                    <span className="truncate pr-2">{item.productName} (x{item.quantity})</span>
                    <span className="font-semibold">{formatMoney(item.totalPrice, "USD")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-neutral-400">Loading tracking dashboard...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
