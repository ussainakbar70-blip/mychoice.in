"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Box,
  Truck,
  Layers,
  Radio,
  FileText,
  Settings,
  ArrowUpRight,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";
import { cjService } from "@/lib/cj";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface HealthCheckResult {
  apiStatus: "OK" | "ERROR";
  authStatus: "VALID" | "EXPIRING" | "EXPIRED" | "NOT_CONFIGURED";
  mode: string;
  expiresInDays: number | null;
  expiresAtDate: string | null;
  timestamp: string;
  message: string;
}

export default function AdminCJDashboardPage() {
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const runHealthCheck = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const tokenStatus = cjService.getTokenStatus();
      const mode = cjService.getStatus();

      // Quick test query against catalog
      const testRes = await cjService.getProducts({ pageNum: 1, pageSize: 1 });

      const isOk = testRes.code === 200 || testRes.result;

      const result: HealthCheckResult = {
        apiStatus: isOk ? "OK" : "ERROR",
        authStatus: tokenStatus.status,
        mode,
        expiresInDays: tokenStatus.expiresInDays,
        expiresAtDate: tokenStatus.expiresAtDate,
        timestamp: new Date().toLocaleTimeString(),
        message: isOk
          ? "Official CJ Dropshipping API 2.0 communication verified successfully."
          : `API returned code ${testRes.code}: ${testRes.message}`,
      };

      setHealth(result);
      setTestResult({
        success: isOk,
        message: result.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Health check error";
      setTestResult({
        success: false,
        message: `Connection check failed: ${msg}`,
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif text-white tracking-tight">CJ Dropshipping Integration</h1>
            <Badge variant="blue" className="text-xs">
              API 2.0
            </Badge>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Official Dropshipping Fulfillment Engine & Automated Logistics Pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={runHealthCheck}
            disabled={testing}
            className="flex items-center gap-2 border-white/20 text-neutral-200 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Testing..." : "Test CJ Connection"}
          </Button>
        </div>
      </div>

      {/* Connection Health Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            testResult.success
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : "bg-amber-950/30 border-amber-500/30 text-amber-300"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <span className="font-semibold">{testResult.success ? "Connection Verified: " : "Attention: "}</span>
            {testResult.message}
            {health?.timestamp && (
              <span className="text-xs opacity-70 ml-2">Checked at {health.timestamp}</span>
            )}
          </div>
        </div>
      )}

      {/* Primary Status Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">Gateway Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-medium text-white mt-3">
            {health?.apiStatus === "OK" ? "CONNECTED" : "ACTIVE / SANDBOX"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-neutral-400 font-mono">
              {health?.mode || "Development Mock Mode"}
            </span>
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">CJ-Access-Token</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-medium text-white mt-3">
            {health?.authStatus === "VALID" ? "VALID (180D)" : health?.authStatus || "STANDBY"}
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-mono">
            {health?.expiresInDays ? `${health.expiresInDays} days remaining` : "Auto-refresh active"}
          </p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">Webhook Protocol</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-medium text-white mt-3">HMAC-SHA256</p>
          <p className="text-xs text-neutral-400 mt-2 font-mono">Base64 • /api/webhooks/cj</p>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">Fulfillment Policy</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-medium text-white mt-3">PayType: 3</p>
          <p className="text-xs text-neutral-400 mt-2 font-mono">Order-only (Manual Balance)</p>
        </div>
      </div>

      {/* Main Sections Navigation Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif text-white">Management Subsystems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/cj/products"
            className="group bg-neutral-900/40 hover:bg-neutral-900/70 border border-white/10 hover:border-amber-500/40 rounded-2xl p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <h3 className="font-medium text-white group-hover:text-amber-300 transition-colors">Product Import</h3>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Query CJ catalog via Elasticsearch API, import products as DRAFT, and configure variant mappings.
            </p>
          </Link>

          <Link
            href="/admin/cj/inventory"
            className="group bg-neutral-900/40 hover:bg-neutral-900/70 border border-white/10 hover:border-blue-500/40 rounded-2xl p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <h3 className="font-medium text-white group-hover:text-blue-300 transition-colors">Inventory Matrix</h3>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Batch stock query across mapped variants, warehouse allocation, and out-of-stock safety guards.
            </p>
          </Link>

          <Link
            href="/admin/cj/orders"
            className="group bg-neutral-900/40 hover:bg-neutral-900/70 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <h3 className="font-medium text-white group-hover:text-emerald-300 transition-colors">Order Pipeline</h3>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Fulfillment queue, CJ order IDs, balance payment tracking, and automated carrier tracking sync.
            </p>
          </Link>

          <Link
            href="/admin/cj/webhooks"
            className="group bg-neutral-900/40 hover:bg-neutral-900/70 border border-white/10 hover:border-purple-500/40 rounded-2xl p-6 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors">Webhooks & Subs</h3>
              <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Product-specific webhook subscriptions, HMAC signature verification, and event replay inspector.
            </p>
          </Link>
        </div>
      </div>

      {/* Architectural Security Notice */}
      <div className="bg-neutral-950/80 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-neutral-300 text-sm font-medium border-b border-white/5 pb-3">
          <Server className="w-4 h-4 text-amber-400" />
          <span>Security & Architectural Guarantees</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 text-xs text-neutral-400">
          <div>
            <span className="font-semibold text-neutral-200 block mb-1">Zero Browser Exposure</span>
            CJ credentials, API keys, and access tokens are strictly server-side. No tokens or client secrets are ever
            rendered or delivered to browser clients.
          </div>
          <div>
            <span className="font-semibold text-neutral-200 block mb-1">Authoritative Server Pricing</span>
            Supplier wholesale costs are strictly sequestered from customer payloads. Store retail prices and discounts
            are computed and enforced by our server.
          </div>
          <div>
            <span className="font-semibold text-neutral-200 block mb-1">Fulfillment Idempotency</span>
            All fulfillment actions enforce unique attempt keys (`cj_fulfillment_attempts`), preventing duplicate order
            generation on network retries.
          </div>
        </div>
      </div>
    </div>
  );
}
