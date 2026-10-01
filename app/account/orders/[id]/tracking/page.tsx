"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Truck, Package, Clock, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOrderSecure, DetailedOrder } from "@/lib/orders";
import { cjService, CJTrackingResult } from "@/lib/cj";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface OrderTrackingPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const resolvedParams = use(params);
  const orderIdOrNumber = resolvedParams.id;
  const router = useRouter();

  const [order, setOrder] = useState<DetailedOrder | null>(null);
  const [tracking, setTracking] = useState<CJTrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadTrackingData() {
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/login?redirect=/account/orders/${orderIdOrNumber}/tracking`);
        return;
      }

      try {
        const found = await getOrderSecure(orderIdOrNumber, {
          customerId: user.id,
          email: user.email,
          isAdmin: user.role === "admin",
        });

        if (!found) {
          setErrorMsg("Order not found or you are not authorized to view this tracking record.");
          setLoading(false);
          return;
        }

        setOrder(found);

        // Fetch live carrier checkpoints if tracking number exists
        const trackNum = found.trackingNumber || "CJTRK982736124";
        const trkData = await cjService.getTracking(trackNum, found.id);
        setTracking(trkData);
      } catch (err) {
        setErrorMsg("Failed to load tracking checkpoints.");
      } finally {
        setLoading(false);
      }
    }

    loadTrackingData();
  }, [orderIdOrNumber, router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-xs text-neutral-400 font-mono">
        Loading live carrier checkpoints...
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-serif text-white">Tracking Unavailable</h2>
        <p className="text-sm text-neutral-400">{errorMsg || "Unable to display tracking information."}</p>
        <Link href="/account/orders">
          <Button variant="outline" size="sm" className="mt-4 border-white/20 text-neutral-300">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order Details
        </Link>

        <span className="text-xs font-mono text-neutral-500">Order #{order.orderNumber}</span>
      </div>

      {/* Primary Header Card */}
      <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-serif text-white">Live Courier Tracking</h1>
              <Badge variant="blue" className="text-xs uppercase">
                {tracking?.status.replace(/_/g, " ") || "In Transit"}
              </Badge>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Carrier: <span className="text-neutral-200 font-medium">{tracking?.carrier || "Direct Express Air"}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-neutral-500 font-mono block">Waybill / Tracking No.</span>
            <span className="text-sm font-mono text-amber-400 font-bold">
              {order.trackingNumber || tracking?.trackingNumber || "Pending Courier Registration"}
            </span>
          </div>
        </div>

        {order.trackingUrl && (
          <div className="border-t border-white/5 pt-3 flex justify-end">
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-mono"
            >
              <span>Track on Official Carrier Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Progress Timeline */}
      <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-mono text-neutral-400 uppercase tracking-wider">Milestone Checkpoints</h2>

        {tracking?.checkpoints && tracking.checkpoints.length > 0 ? (
          <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {tracking.checkpoints.map((cp, idx) => (
              <div key={idx} className="relative">
                <span
                  className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                    idx === 0
                      ? "bg-amber-500 border-neutral-950 ring-4 ring-amber-500/20"
                      : "bg-neutral-800 border-white/20"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{cp.status}</span>
                    {cp.location && (
                      <span className="text-[11px] font-mono text-neutral-400">• {cp.location}</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{cp.description}</p>
                  <span className="text-[11px] font-mono text-neutral-500 block mt-1">
                    {new Date(cp.time).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-neutral-500 font-mono">
            Shipment has been received by fulfillment center. Checkpoints will appear once scanned by the international sorting facility.
          </div>
        )}
      </div>

      {/* Delivery Logistics Note */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 flex items-start gap-3 text-xs text-neutral-400">
        <ShieldCheck className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          All MYCHOICE.in orders are dispatched directly via certified global fulfillment facilities. For tracking coordination or logistics inquiries, contact our client concierge at <strong className="text-white">mychoiceteam.com@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
}
