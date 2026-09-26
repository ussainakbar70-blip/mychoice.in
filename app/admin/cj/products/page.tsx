"use client";

import React, { useState, useEffect } from "react";
import { Search, Download, Check, ExternalLink, Loader2, Sparkles, Filter } from "lucide-react";
import { cjService, CJProductItem } from "@/lib/cj";
import { dbStore } from "@/lib/db/client";
import { CATEGORIES } from "@/lib/db/seed-data";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function CJProductImporterPage() {
  const [products, setProducts] = useState<CJProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<CJProductItem | null>(null);

  // Import modal configuration
  const [targetCategory, setTargetCategory] = useState("cat-home-kitchen");
  const [markupMultiplier, setMarkupMultiplier] = useState(2.5);
  const [importSuccess, setImportSuccess] = useState(false);

  const fetchCJCatalog = async (query = "") => {
    setLoading(true);
    try {
      const res = await cjService.getProducts({ productName: query || undefined, pageSize: 12 });
      if (res.data?.list) {
        setProducts(res.data.list);
      }
    } catch (err) {
      console.error("Error querying CJ catalog:", err);
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

  const handleImport = () => {
    if (!selectedProduct) return;

    const supplierCost = Number(selectedProduct.sellPrice) || 15;
    const storePrice = Number((supplierCost * markupMultiplier).toFixed(2));
    const slug = selectedProduct.productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Add imported product to local store as draft
    dbStore.addProduct({
      id: `cj_imp_${Date.now()}`,
      slug,
      name: selectedProduct.productName,
      shortDescription: `Curated ${selectedProduct.categoryName} essential directly sourced via verified fulfillment.`,
      description: `Premium quality ${selectedProduct.productName}. Engineered for reliability and modern minimalist aesthetics.`,
      categoryId: targetCategory,
      brandName: "MYCHOICE",
      status: "draft", // Strict requirement: Default to draft
      riskStatus: "normal",
      featured: false,
      bestseller: false,
      newArrival: true,
      seoTitle: `${selectedProduct.productName} | MYCHOICE.in`,
      seoDescription: `Shop the curated ${selectedProduct.productName}. Fast tracked international delivery.`,
      baseCurrency: "USD",
      basePrice: storePrice,
      compareAtPrice: Number((storePrice * 1.3).toFixed(2)),
      cjProductId: selectedProduct.pid,
      cjProductSku: selectedProduct.productSku,
      productRating: 5.0,
      reviewCount: 0,
      images: [
        {
          id: `img_${Date.now()}`,
          publicUrl: selectedProduct.productImage,
          altText: selectedProduct.productName,
          isPrimary: true,
          sortOrder: 1,
        },
      ],
      variants: [
        {
          id: `var_${Date.now()}`,
          cjVariantId: selectedProduct.variants?.[0]?.vid || `CJ-V-${selectedProduct.pid}`,
          sku: `MY-${selectedProduct.productSku.substring(0, 10)}`,
          option1Name: "Style",
          option1Value: "Standard",
          price: storePrice,
          compareAtPrice: Number((storePrice * 1.3).toFixed(2)),
          costPrice: supplierCost,
          shippingCost: 4.5,
          inventoryQuantity: 100,
          weight: selectedProduct.productWeight || 300,
          isActive: true,
        },
      ],
      specifications: {
        Supplier: "CJdropshipping Verified",
        Weight: `${selectedProduct.productWeight || 300}g`,
      },
      features: ["Imported directly via official CJdropshipping API v2", "Authentic verified materials"],
    });

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      setSelectedProduct(null);
    }, 1500);
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
            Search CJ warehouse inventory, preview supplier pricing, and import items as drafts into your store.
          </p>
        </div>
        <Badge variant="gold">API Mode: {cjService.getStatus()}</Badge>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search CJ catalog (e.g. kettle, diffuser, yoga, wireless)..."
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
          <p className="text-xs text-neutral-500">Querying CJdropshipping API v2.0...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
          No CJ products found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((item) => (
            <div
              key={item.pid}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="outline" className="bg-neutral-950/80 text-white border-none font-mono text-[9px]">
                      PID: {item.pid}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2">
                    {item.productName}
                  </h3>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-neutral-500">Supplier Cost:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {formatMoney(Number(item.sellPrice) || 15, "USD")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Weight: {item.productWeight || 250}g</span>
                    <span>SKU: {item.productSku.substring(0, 12)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => setSelectedProduct(item)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Import to Store
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 animate-slide-down">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Import Product As Draft
            </h3>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850 text-xs">
              <img
                src={selectedProduct.productImage}
                alt={selectedProduct.productName}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-white truncate">
                  {selectedProduct.productName}
                </p>
                <p className="text-neutral-500">
                  CJ Cost: {formatMoney(Number(selectedProduct.sellPrice) || 15, "USD")}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Map to Store Collection
                </label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                >
                  {CATEGORIES.map((c) => (
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
                  <span>Selling Price:</span>
                  <strong className="text-neutral-900 dark:text-white">
                    {formatMoney((Number(selectedProduct.sellPrice) || 15) * markupMultiplier, "USD")}
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                ℹ️ <strong>Draft Notice</strong>: Imported products are safely saved in &lsquo;draft&rsquo; status.
                You can review specifications, SEO, and variants before publishing to customers.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                rightIcon={importSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : undefined}
              >
                {importSuccess ? "Imported to Drafts!" : "Confirm Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
