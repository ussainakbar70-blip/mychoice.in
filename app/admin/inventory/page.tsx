"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Boxes, AlertTriangle, RefreshCw, CheckCircle2, Search, SlidersHorizontal } from "lucide-react";
import { adminGetInventory, adminUpdateInventoryQuantity, InventoryItem } from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [threshold, setThreshold] = useState(25);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await adminGetInventory(threshold);
      setInventory(items);
      const vals: Record<string, number> = {};
      items.forEach((i) => (vals[i.variantId] = i.inventoryQuantity));
      setEditValues(vals);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveQuantity = async (variantId: string) => {
    setUpdatingId(variantId);
    const newQty = editValues[variantId] ?? 0;
    try {
      await adminUpdateInventoryQuantity(variantId, newQty);
      await loadData();
    } catch {
      alert("Failed to update stock.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = inventory.filter((i) => i.isLowStock).length;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Variant Inventory Matrix
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Authoritative warehouse stock monitoring, configurable deficit thresholds, and rapid replenishment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Threshold and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="max-w-xs w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Deficit Alert Threshold:</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs text-center"
            />
          </div>

          <Badge variant={lowStockCount > 0 ? "danger" : "success"}>
            {lowStockCount} below threshold
          </Badge>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading inventory data...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Variant Spec</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4">Units in Stock</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Quick Stock Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((item) => (
                  <tr key={item.variantId} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                      {item.productName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {item.variantName || "Standard"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-400">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={item.status === "published" ? "success" : "neutral"} size="sm">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-sm text-neutral-900 dark:text-white">
                      {item.inventoryQuantity}
                    </td>
                    <td className="py-3 px-4">
                      {item.isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Low Stock (&le;{threshold})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Adequate</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          value={editValues[item.variantId] ?? item.inventoryQuantity}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              [item.variantId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs text-center"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={updatingId === item.variantId}
                          onClick={() => handleSaveQuantity(item.variantId)}
                        >
                          Save
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400">No variant records found.</div>
        )}
      </div>
    </div>
  );
}
