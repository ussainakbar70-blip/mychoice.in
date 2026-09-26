"use client";

import React, { useState } from "react";
import {
  Search,
  Plus,
  Calculator,
  ExternalLink,
  Check,
  AlertTriangle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { DEMO_PRODUCTS, CATEGORIES, SeedProduct } from "@/lib/db/seed-data";
import { calculateProfitMargin, AdminProfitCalculation } from "@/lib/pricing/calculator";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<SeedProduct[]>(DEMO_PRODUCTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProductForCalc, setSelectedProductForCalc] = useState<SeedProduct | null>(null);

  // Profit Calculator State
  const [calcSellingPrice, setCalcSellingPrice] = useState(58);
  const [calcCostPrice, setCalcCostPrice] = useState(19.5);
  const [calcShippingCost, setCalcShippingCost] = useState(4.8);
  const [calcPaymentFee, setCalcPaymentFee] = useState(2.9);

  const openCalculator = (product: SeedProduct) => {
    setSelectedProductForCalc(product);
    setCalcSellingPrice(product.basePrice);
    setCalcCostPrice(product.variants[0]?.costPrice || 15);
    setCalcShippingCost(product.variants[0]?.shippingCost || 4.5);
  };

  const calculation: AdminProfitCalculation = calculateProfitMargin(
    calcSellingPrice,
    calcCostPrice,
    calcShippingCost,
    0, // tax
    calcPaymentFee
  );

  const toggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "published" ? "draft" : "published" }
          : p
      )
    );
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.cjProductSku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Products &amp; Profit Margins
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Maintain selling prices, supplier cost mappings, and analyze bottom-line unit margins.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gold"
            size="sm"
            onClick={() => alert("To import products directly from CJdropshipping, visit the CJ Product Importer.")}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Product
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or CJ ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-neutral-900 dark:text-white focus:outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-neutral-500">Collection:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All 8 Collections</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold bg-neutral-50/50 dark:bg-neutral-850/50">
                <th className="p-4">Product</th>
                <th className="p-4">CJ Mapping</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Supplier Cost</th>
                <th className="p-4">Unit Margin</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredProducts.map((p) => {
                const cost = p.variants[0]?.costPrice || 15;
                const shipping = p.variants[0]?.shippingCost || 4.5;
                const marginCalc = calculateProfitMargin(p.basePrice, cost, shipping);

                return (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                          <img
                            src={p.images[0]?.publicUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <span className="text-[10px] text-neutral-400">
                            {CATEGORIES.find((c) => c.id === p.categoryId)?.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-neutral-500">
                      <div>PID: {p.cjProductId}</div>
                      <div className="text-neutral-400">SKU: {p.cjProductSku}</div>
                    </td>

                    <td className="p-4 font-bold text-neutral-900 dark:text-white">
                      {formatMoney(p.basePrice, "USD")}
                    </td>

                    <td className="p-4 font-medium text-neutral-500">
                      {formatMoney(cost, "USD")}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            marginCalc.isBelowThreshold
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {marginCalc.marginPercent}%
                        </span>
                        {marginCalc.isBelowThreshold && (
                          <span title="Below 35% margin threshold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        Net: {formatMoney(marginCalc.netProfit, "USD")}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(p.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          p.status === "published"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {p.status}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCalculator(p)}
                        leftIcon={<Calculator className="w-3.5 h-3.5" />}
                      >
                        Analyze Margin
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profit Margin Calculator Modal */}
      {selectedProductForCalc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => setSelectedProductForCalc(null)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 animate-slide-down">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-gold" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Unit Economics Calculator
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductForCalc(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                {selectedProductForCalc.name}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
                    Store Selling Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcSellingPrice}
                    onChange={(e) => setCalcSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
                    CJ Supplier Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcCostPrice}
                    onChange={(e) => setCalcCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
                    Estimated CJ Shipping ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={calcShippingCost}
                    onChange={(e) => setCalcShippingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-neutral-500 mb-1">
                    Payment Gateway Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcPaymentFee}
                    onChange={(e) => setCalcPaymentFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              {/* Real-time Result Summary Box */}
              <div
                className={`p-4 rounded-xl border ${
                  calculation.isBelowThreshold
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                } space-y-2`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Net Profit Per Unit:
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {formatMoney(calculation.netProfit, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Calculated Margin:
                  </span>
                  <span
                    className={`text-base font-extrabold ${
                      calculation.isBelowThreshold
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {calculation.marginPercent}%
                  </span>
                </div>

                {calculation.isBelowThreshold && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                    ⚠️ Margin warning: Current net profit falls below your configured 35% minimum threshold.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProductForCalc(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === selectedProductForCalc.id
                        ? { ...p, basePrice: calcSellingPrice }
                        : p
                    )
                  );
                  setSelectedProductForCalc(null);
                }}
              >
                Save Selling Price
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
