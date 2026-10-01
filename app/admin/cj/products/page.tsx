"use client";

import React, { useState, useEffect } from "react";
import { Search, Check, ExternalLink, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { CJProductItem } from "@/lib/cj";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STORE_CATEGORIES = [
  { id: "a1000000-0000-0000-0000-000000000001", name: "Home & Kitchen" },
  { id: "a1000000-0000-0000-0000-000000000002", name: "Pet Supplies" },
  { id: "a1000000-0000-0000-0000-000000000003", name: "Beauty & Personal Care" },
  { id: "a1000000-0000-0000-0000-000000000004", name: "Ornaments & Fashion Accessories" },
  { id: "a1000000-0000-0000-0000-000000000005", name: "Phone & Tech Accessories" },
  { id: "a1000000-0000-0000-0000-000000000006", name: "Fitness & Wellness" },
  { id: "a1000000-0000-0000-0000-000000000007", name: "Eco-Friendly & Sustainable" },
  { id: "a1000000-0000-0000-0000-000000000008", name: "Baby & Kids" },
];

export default function CJProductImporterPage() {
  const [products, setProducts] = useState<CJProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CJProductItem | null>(null);

  // Import modal configuration
  const [targetCategory, setTargetCategory] = useState(STORE_CATEGORIES[1].id); // Default to Pet Supplies
  const [markupMultiplier, setMarkupMultiplier] = useState(2.5);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchCJCatalog = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cj/products?keyword=${encodeURIComponent(query)}&pageSize=12`);
      const json = await res.json();
      if (json.data?.list) {
        setProducts(json.data.list);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error querying CJ catalog:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCJCatalog();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCJCatalog(searchQuery);
  };

  const handleImport = async () => {
    if (!selectedProduct) return;
    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/admin/cj/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cjProductId: selectedProduct.pid,
          localCategoryId: targetCategory,
          markupPercentage: Math.round((markupMultiplier - 1) * 100),
          customTitle: selectedProduct.productNameEn || selectedProduct.productName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to import product");
      }

      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setSelectedProduct(null);
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-brand-gold font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official CJdropshipping Open API v2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            CJ Catalog Explorer &amp; Importer
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Search live CJ warehouse inventory, preview supplier pricing, and import items directly into your database.
          </p>
        </div>
        <Badge variant="gold">Mode: Live API 2.0</Badge>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search CJ catalog (e.g. pet hair remover, diffuser, shoes, watch)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
        <Button variant="primary" size="md" type="submit" isLoading={loading}>
          Search Catalog
        </Button>
      </form>

      {/* Catalog Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Querying live CJdropshipping API v2.0...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
          <p className="text-xs text-neutral-500 mb-2">No products found for this query.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); fetchCJCatalog(""); }}>
            Reset Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const cost = Number(product.sellPrice) || 15;
            const title = product.productNameEn || product.productName;
            return (
              <div
                key={product.pid}
                className="group relative flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-neutral-100 dark:bg-neutral-850 relative overflow-hidden">
                  <img
                    src={product.productImage}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="neutral" className="text-[10px] bg-black/60 backdrop-blur-md text-white border-0">
                      PID: {product.pid.slice(0, 10)}...
                    </Badge>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                      {product.categoryName || "General"}
                    </span>
                    <h3 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2 mt-0.5" title={title}>
                      {title}
                    </h3>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 text-[11px]">Wholesale Cost:</span>
                      <strong className="font-semibold text-neutral-900 dark:text-white">
                        {formatMoney(cost, "USD")}
                      </strong>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setSelectedProduct(product);
                        setImportError(null);
                      }}
                    >
                      Import to Store
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => !importing && setSelectedProduct(null)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 animate-slide-down">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Import CJ Product into Database
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 text-xs">
              <img
                src={selectedProduct.productImage}
                alt={selectedProduct.productNameEn || selectedProduct.productName}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-white truncate">
                  {selectedProduct.productNameEn || selectedProduct.productName}
                </p>
                <p className="text-neutral-500">
                  CJ Cost: {formatMoney(Number(selectedProduct.sellPrice) || 15, "USD")}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Store Collection
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {STORE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Pricing Markup Multiplier: {markupMultiplier}x
                </label>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={markupMultiplier}
                  onChange={(e) => setMarkupMultiplier(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-brand-gold"
                />
                <div className="flex justify-between text-neutral-500 pt-1">
                  <span>Calculated Store Price:</span>
                  <strong className="text-neutral-900 dark:text-white">
                    {formatMoney((Number(selectedProduct.sellPrice) || 15) * markupMultiplier, "USD")}
                  </strong>
                </div>
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                ℹ️ <strong>Draft Notice</strong>: Imported products are safely saved in &lsquo;draft&rsquo; status in your Supabase database. You can review variants and toggle to active in <code>/admin/products</code> to publish.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => setSelectedProduct(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={importing}
                onClick={handleImport}
                rightIcon={importSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
              >
                {importSuccess ? "Imported to Database!" : "Confirm Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
