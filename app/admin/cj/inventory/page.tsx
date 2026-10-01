"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Box,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cjService } from "@/lib/cj";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";

interface InventoryMatrixItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  cjVariantId: string;
  warehouse: string;
  cjStock: number;
  storeStock: number;
  lastSync: string;
  status: "SYNCED" | "LOW_STOCK" | "OUT_OF_STOCK" | "SYNC_ERROR" | "NOT_MAPPED";
}

export default function AdminCJInventoryPage() {
  const [items, setItems] = useState<InventoryMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadInventory = () => {
    setLoading(true);
    // Gather all variants from demo products and local store
    const list: InventoryMatrixItem[] = [];

    for (const p of DEMO_PRODUCTS) {
      for (const v of p.variants) {
        const isMapped = Boolean(v.cjVariantId);
        let status: InventoryMatrixItem["status"] = "SYNCED";
        if (!isMapped) status = "NOT_MAPPED";
        else if (v.inventoryQuantity === 0) status = "OUT_OF_STOCK";
        else if (v.inventoryQuantity <= 10) status = "LOW_STOCK";

        list.push({
          productId: p.id,
          productName: p.name,
          variantId: v.id,
          variantName: `${v.option1Name || "Option"}: ${v.option1Value || "Default"}`,
          sku: v.sku,
          cjVariantId: v.cjVariantId || "N/A",
          warehouse: "CHINA (Yiwu)",
          cjStock: v.inventoryQuantity,
          storeStock: v.inventoryQuantity,
          lastSync: "Just now",
          status,
        });
      }
    }

    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const summary = await cjService.syncInventory();
      setSyncResult(
        `Synchronized ${summary.updated} of ${summary.totalChecked} variants. (${summary.lowStockCount} low stock, ${summary.outOfStockCount} out of stock)`
      );
      loadInventory();
    } catch (err: unknown) {
      setSyncResult("Inventory synchronization failed.");
    } finally {
      setSyncing(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.cjVariantId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Link href="/admin/cj" className="hover:text-white transition-colors">
          CJ Integration
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">Inventory Synchronization</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-tight">CJ Inventory Matrix</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time supplier stock reconciliation across mapped warehouses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSyncAll}
            disabled={syncing}
            size="sm"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronizing Stock..." : "Sync All Inventory"}
          </Button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/30 text-blue-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
          <span>{syncResult}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product title, local SKU, or CJ Variant ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex gap-2">
          {["all", "SYNCED", "LOW_STOCK", "OUT_OF_STOCK", "NOT_MAPPED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                filterStatus === st
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 font-mono border-b border-white/10 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / Variant</th>
                <th className="py-3 px-4">SKU / CJ Variant ID</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">CJ Stock</th>
                <th className="py-3 px-4">Store Stock</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    Loading inventory matrix...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No matching inventory variants found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.variantId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-white line-clamp-1">{item.productName}</div>
                      <div className="text-xs text-neutral-400">{item.variantName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-white">{item.sku}</div>
                      <div className="text-neutral-500 text-[11px]">{item.cjVariantId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300">{item.warehouse}</td>
                    <td className="py-3.5 px-4 font-bold text-neutral-200">{item.cjStock}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{item.storeStock}</td>
                    <td className="py-3.5 px-4 text-neutral-400">{item.lastSync}</td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "SYNCED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : item.status === "LOW_STOCK"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : item.status === "OUT_OF_STOCK"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-neutral-800 text-neutral-400 border border-white/10"
                        }`}
                      >
                        {item.status}
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
