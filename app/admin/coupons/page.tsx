"use client";

import React, { useState, useEffect } from "react";
import { Ticket, Plus, Check, RefreshCw, X, AlertCircle } from "lucide-react";
import { adminGetCoupons, adminCreateCoupon, adminToggleCouponActive, CouponItem } from "@/lib/coupons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number | undefined>(50);
  const [maximumDiscount, setMaximumDiscount] = useState<number | undefined>(30);
  const [usageLimit, setUsageLimit] = useState<number | undefined>(undefined);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const list = await adminGetCoupons();
      setCoupons(list);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleActive = async (id: string, current: boolean) => {
    const updated = await adminToggleCouponActive(id, current);
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: updated } : c))
    );
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setCreating(true);

    try {
      const created = await adminCreateCoupon({
        code: code.trim(),
        description: description.trim() || undefined,
        discountType,
        discountValue,
        minimumOrderValue,
        maximumDiscount,
        usageLimit,
      });

      setCoupons((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCode("");
      setDescription("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create coupon";
      setErrorMsg(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Promotional Coupons &amp; Vouchers
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Server-enforced discount codes, usage limits, and order minimum thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadCoupons} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Create Coupon
          </Button>
        </div>
      </div>

      {showCreateModal && (
        <form onSubmit={handleCreateCoupon} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Create Promotional Code
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Coupon Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. VIP25"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="percentage">Percentage Off (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Discount Value</label>
              <input
                type="number"
                step="0.01"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Min Order ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={minimumOrderValue ?? ""}
                onChange={(e) => setMinimumOrderValue(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Max Cap ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={maximumDiscount ?? ""}
                onChange={(e) => setMaximumDiscount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Optional limit"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Usage Limit</label>
              <input
                type="number"
                value={usageLimit ?? ""}
                onChange={(e) => setUsageLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Unlimited if empty"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 mb-1">Description / Campaign Purpose</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Seasonal promotion for new subscribers"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating}>
              Create Coupon
            </Button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading coupons...</div>
        ) : coupons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Benefit</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                    <td className="py-3 px-4 font-mono font-bold text-brand-gold text-sm">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                      {c.discountType === "percentage" ? `${c.discountValue}% Off` : `$${c.discountValue.toFixed(2)} Off`}
                      {c.description && <span className="block text-[11px] text-neutral-400 font-normal">{c.description}</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {c.minimumOrderValue ? `Min $${c.minimumOrderValue.toFixed(2)}` : "No minimum"}
                      {c.maximumDiscount ? ` • Max cap $${c.maximumDiscount.toFixed(2)}` : ""}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : "redemptions"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={c.isActive ? "success" : "neutral"} size="sm">
                        {c.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant={c.isActive ? "outline" : "primary"}
                        onClick={() => handleToggleActive(c.id, c.isActive)}
                      >
                        {c.isActive ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400">No active coupons configured.</div>
        )}
      </div>
    </div>
  );
}
