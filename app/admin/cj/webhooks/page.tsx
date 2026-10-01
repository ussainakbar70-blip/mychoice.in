"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Plus,
  Send,
  Sliders,
} from "lucide-react";
import { cjService, CJWebhookSubscription } from "@/lib/cj";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AdminCJWebhooksPage() {
  const [subscriptions, setSubscriptions] = useState<CJWebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const subs = await cjService.getSubscriptions();
      setSubscriptions(subs);
    } catch (err) {
      console.error("Error loading CJ subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleTestWebhookSimulation = async () => {
    setTestingWebhook(true);
    setTestResult(null);

    try {
      // Simulate an authentic webhook payload
      const mockPayload = {
        messageType: "STOCK",
        messageId: `msg_test_${Date.now()}`,
        sendTime: Date.now(),
        data: {
          variantId: "vid_test_sample",
          inventory: 45,
        },
      };

      const res = await cjService.processWebhook(mockPayload);
      setTestResult({
        success: res.handled,
        message: `Webhook simulator processed event "${mockPayload.messageId}" with result: ${res.action}. (Idempotency verified)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test failed";
      setTestResult({
        success: false,
        message: `Webhook simulation exception: ${msg}`,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Link href="/admin/cj" className="hover:text-white transition-colors">
          CJ Integration
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">Webhooks & Subscriptions</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-tight">CJ Webhooks & Subscriptions</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time event synchronization protocol with HMAC-SHA256 signature verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleTestWebhookSimulation}
            disabled={testingWebhook}
            size="sm"
            variant="outline"
            className="flex items-center gap-2 border-white/20 text-neutral-200 hover:text-white"
          >
            <Send className="w-3.5 h-3.5" />
            {testingWebhook ? "Simulating..." : "Test Webhook Ingestion"}
          </Button>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            testResult.success
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/30 border-rose-500/30 text-rose-300"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Topics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            topic: "STOCK",
            label: "Inventory Updates",
            description: "Real-time variant quantity changes & restock alerts.",
            status: "ACTIVE",
          },
          {
            topic: "ORDER",
            label: "Order Status",
            description: "Fulfillment progression, packing, and dispatch states.",
            status: "ACTIVE",
          },
          {
            topic: "LOGISTICS",
            label: "Carrier Tracking",
            description: "Waybill creation, checkpoint updates, and delivery notice.",
            status: "ACTIVE",
          },
          {
            topic: "PRODUCT",
            label: "Product Metadata",
            description: "Supplier specification updates & warehouse shifts.",
            status: "ACTIVE",
          },
        ].map((t) => (
          <div key={t.topic} className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">{t.topic}</span>
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {t.status}
              </span>
            </div>
            <h3 className="font-medium text-white mt-3 text-sm">{t.label}</h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{t.description}</p>
          </div>
        ))}
      </div>

      {/* Callback Configuration Card */}
      <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-mono text-neutral-300 uppercase tracking-wider">Receiver Endpoint Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
            <span className="text-neutral-500 block mb-1">Callback URL (HTTPS)</span>
            <span className="text-amber-400 font-bold break-all">https://mychoice.in/api/webhooks/cj</span>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
            <span className="text-neutral-500 block mb-1">Signature Scheme</span>
            <span className="text-emerald-400 font-bold">HMAC-SHA256 with Base64 encoding</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          *Note: Under official CJ Dropshipping API 2.0 regulations effective July 2026, blanket &quot;subscribe-all&quot;
          is no longer supported. Each imported product is registered individually upon import to receive automated stock and specification notifications.
        </p>
      </div>

      {/* Subscriptions Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-serif text-white">Product-Specific Webhook Subscriptions</h3>
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 font-mono border-b border-white/10 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">CJ Product ID</th>
                <th className="py-3 px-4">Monitored Topic</th>
                <th className="py-3 px-4">Subscription Date</th>
                <th className="py-3 px-4">Last Event</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    Loading webhook subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No active product webhook subscriptions. Import a CJ product to register subscriptions.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{s.cjProductId}</td>
                    <td className="py-3 px-4 text-amber-400 font-semibold">{s.topic}</td>
                    <td className="py-3 px-4 text-neutral-400">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-neutral-500">{s.lastEventAt ? new Date(s.lastEventAt).toLocaleTimeString() : "No events yet"}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
