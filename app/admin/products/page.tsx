"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Calculator,
  ExternalLink,
  Check,
  AlertTriangle,
  X,
  SlidersHorizontal,
  Edit2,
  Star,
  Flame,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import { DEMO_PRODUCTS, CATEGORIES, SeedProduct, SeedCategory } from "@/lib/db/seed-data";
import {
  getProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProductPublish,
  adminToggleProductFlag,
} from "@/lib/db/products";
import { getCategories } from "@/lib/db/categories";
import { calculateProfitMargin, AdminProfitCalculation } from "@/lib/pricing/calculator";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<SeedProduct[]>(DEMO_PRODUCTS);
  const [categories, setCategories] = useState<SeedCategory[]>(CATEGORIES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProductForCalc, setSelectedProductForCalc] = useState<SeedProduct | null>(null);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SeedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formBrandName, setFormBrandName] = useState("MYCHOICE");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formBasePrice, setFormBasePrice] = useState(50);
  const [formCompareAtPrice, setFormCompareAtPrice] = useState<number | undefined>(75);
  const [formStatus, setFormStatus] = useState<"published" | "draft" | "archived">("published");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formBestseller, setFormBestseller] = useState(false);
  const [formNewArrival, setFormNewArrival] = useState(true);
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formVariantSku, setFormVariantSku] = useState("");
  const [formCostPrice, setFormCostPrice] = useState(18);
  const [formShippingCost, setFormShippingCost] = useState(4.5);
  const [formInventory, setFormInventory] = useState(100);

  // Profit Calculator State
  const [calcSellingPrice, setCalcSellingPrice] = useState(58);
  const [calcCostPrice, setCalcCostPrice] = useState(19.5);
  const [calcShippingCost, setCalcShippingCost] = useState(4.8);
  const [calcPaymentFee, setCalcPaymentFee] = useState(2.9);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, { products: prods }] = await Promise.all([
          getCategories(),
          getProducts({ status: "all", limit: 100 }),
        ]);
        setCategories(cats);
        setProducts(prods);
        if (cats.length > 0) setFormCategoryId(cats[0].id);
      } catch (err) {
        console.error("Failed to load products/categories:", err);
      }
    }
    loadData();
  }, []);

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

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setFormCategoryId(categories[0]?.id || "");
    setFormBrandName("MYCHOICE");
    setFormShortDesc("");
    setFormDesc("");
    setFormBasePrice(59);
    setFormCompareAtPrice(79);
    setFormStatus("published");
    setFormFeatured(false);
    setFormBestseller(false);
    setFormNewArrival(true);
    setFormSeoTitle("");
    setFormSeoDesc("");
    setFormImageUrl("https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80");
    setFormVariantSku(`SKU-${Date.now().toString().slice(-6)}`);
    setFormCostPrice(19.5);
    setFormShippingCost(4.8);
    setFormInventory(100);
    setIsModalOpen(true);
  };

  const openEditModal = (p: SeedProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormCategoryId(p.categoryId);
    setFormBrandName(p.brandName);
    setFormShortDesc(p.shortDescription);
    setFormDesc(p.description);
    setFormBasePrice(p.basePrice);
    setFormCompareAtPrice(p.compareAtPrice);
    setFormStatus(p.status);
    setFormFeatured(p.featured);
    setFormBestseller(p.bestseller);
    setFormNewArrival(p.newArrival);
    setFormSeoTitle(p.seoTitle);
    setFormSeoDesc(p.seoDescription);
    setFormImageUrl(p.images[0]?.publicUrl || "");
    const v = p.variants[0];
    setFormVariantSku(v?.sku || `SKU-${p.id.slice(0, 6)}`);
    setFormCostPrice(v?.costPrice || 15);
    setFormShippingCost(v?.shippingCost || 4.5);
    setFormInventory(v?.inventoryQuantity ?? 100);
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!editingProduct) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setFormSlug(slug);
      setFormSeoTitle(`${name} | MYCHOICE.in`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProduct) {
        const updated = await adminUpdateProduct(editingProduct.id, {
          name: formName,
          slug: formSlug,
          categoryId: formCategoryId,
          brandName: formBrandName,
          shortDescription: formShortDesc,
          description: formDesc,
          basePrice: formBasePrice,
          compareAtPrice: formCompareAtPrice,
          status: formStatus,
          featured: formFeatured,
          bestseller: formBestseller,
          newArrival: formNewArrival,
          seoTitle: formSeoTitle,
          seoDescription: formSeoDesc,
        });
        if (updated) {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      } else {
        const created = await adminCreateProduct({
          name: formName,
          slug: formSlug,
          categoryId: formCategoryId,
          brandName: formBrandName,
          shortDescription: formShortDesc,
          description: formDesc,
          basePrice: formBasePrice,
          compareAtPrice: formCompareAtPrice,
          status: formStatus,
          featured: formFeatured,
          bestseller: formBestseller,
          newArrival: formNewArrival,
          seoTitle: formSeoTitle,
          seoDescription: formSeoDesc,
          variants: [
            {
              sku: formVariantSku,
              price: formBasePrice,
              compareAtPrice: formCompareAtPrice,
              costPrice: formCostPrice,
              shippingCost: formShippingCost,
              inventoryQuantity: formInventory,
            },
          ],
          images: [
            {
              publicUrl: formImageUrl,
              altText: formName,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        });
        setProducts((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Save error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (p: SeedProduct) => {
    try {
      const nextStatus = await adminToggleProductPublish(p.id, p.status);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, status: nextStatus as any } : item
        )
      );
    } catch (err: any) {
      alert(`Error toggling status: ${err.message || err}`);
    }
  };

  const handleToggleFlag = async (
    p: SeedProduct,
    flag: "featured" | "bestseller" | "newArrival"
  ) => {
    try {
      const nextVal = await adminToggleProductFlag(p.id, flag, p[flag]);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, [flag]: nextVal } : item
        )
      );
    } catch (err: any) {
      alert(`Error updating ${flag}: ${err.message || err}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.cjProductSku.toLowerCase().includes(search.toLowerCase()) &&
      !p.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()))
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
            <span>Product Engine &amp; Margins</span>
            <Badge variant="gold">{products.length} Products</Badge>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Maintain pricing, merchandising badges, inventory counts, variants, and unit profit thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gold"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Product
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or brand..."
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
            <option value="all">All Collections</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <span className="text-neutral-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-900 dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
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
                <th className="p-4">Merchandising</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Supplier Cost</th>
                <th className="p-4">Unit Margin</th>
                <th className="p-4 text-center">Status</th>
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
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                            <span>{categories.find((c) => c.id === p.categoryId)?.name}</span>
                            <span>•</span>
                            <span className="font-mono">{p.variants[0]?.sku || p.cjProductSku}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleFlag(p, "featured")}
                          title={`Toggle Featured (${p.featured ? "Active" : "Inactive"})`}
                          className={`p-1.5 rounded-md text-[10px] font-medium transition-colors ${
                            p.featured
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${p.featured ? "fill-amber-400" : ""}`} />
                        </button>

                        <button
                          onClick={() => handleToggleFlag(p, "bestseller")}
                          title={`Toggle Bestseller (${p.bestseller ? "Active" : "Inactive"})`}
                          className={`p-1.5 rounded-md text-[10px] font-medium transition-colors ${
                            p.bestseller
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <Flame className={`w-3.5 h-3.5 ${p.bestseller ? "fill-rose-500" : ""}`} />
                        </button>

                        <button
                          onClick={() => handleToggleFlag(p, "newArrival")}
                          title={`Toggle New Arrival (${p.newArrival ? "Active" : "Inactive"})`}
                          className={`p-1.5 rounded-md text-[10px] font-medium transition-colors ${
                            p.newArrival
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${p.newArrival ? "fill-indigo-400" : ""}`} />
                        </button>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-neutral-900 dark:text-white">
                      {formatMoney(p.basePrice, "USD")}
                      {p.compareAtPrice && p.compareAtPrice > p.basePrice && (
                        <span className="text-[10px] text-neutral-400 block line-through">
                          {formatMoney(p.compareAtPrice, "USD")}
                        </span>
                      )}
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

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          p.status === "published"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : p.status === "draft"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {p.status === "published" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{p.status}</span>
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          leftIcon={<Edit2 className="w-3 h-3" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCalculator(p)}
                          leftIcon={<Calculator className="w-3 h-3" />}
                        >
                          Margin
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 space-y-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                {editingProduct ? "Edit Product & Variants" : "Create New Product"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Product Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Minimalist Ultrasonic Aroma Diffuser"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="minimalist-ultrasonic-diffuser"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={formBrandName}
                    onChange={(e) => setFormBrandName(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Short Editorial Subtitle
                </label>
                <input
                  type="text"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="Whisper-quiet ceramic ultrasonic diffuser..."
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Full Description &amp; Specifications
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                />
              </div>

              {/* Pricing & Economics */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block">
                  Pricing &amp; Variant Configuration
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formBasePrice}
                      onChange={(e) => setFormBasePrice(Number(e.target.value))}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Compare Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCompareAtPrice || ""}
                      onChange={(e) => setFormCompareAtPrice(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 79.00"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Supplier Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(Number(e.target.value))}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Inventory Qty
                    </label>
                    <input
                      type="number"
                      value={formInventory}
                      onChange={(e) => setFormInventory(Number(e.target.value))}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Primary Variant SKU
                    </label>
                    <input
                      type="text"
                      value={formVariantSku}
                      onChange={(e) => setFormVariantSku(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Main Product Image URL
                    </label>
                    <input
                      type="url"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Badges & Flags */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block">
                  Merchandising Flags &amp; Publishing
                </span>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-brand-gold"
                    />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Featured Curation
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formBestseller}
                      onChange={(e) => setFormBestseller(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-brand-gold"
                    />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Best Seller
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formNewArrival}
                      onChange={(e) => setFormNewArrival(e.target.checked)}
                      className="w-4 h-4 rounded text-neutral-900 focus:ring-brand-gold"
                    />
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      New Arrival
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">Status:</span>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-neutral-900 dark:text-white"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEO Meta Fields */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block">
                  SEO &amp; OpenGraph Meta
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      value={formSeoTitle}
                      onChange={(e) => setFormSeoTitle(e.target.value)}
                      placeholder="e.g. Minimalist Ultrasonic Aroma Diffuser | MYCHOICE.in"
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      SEO Meta Description
                    </label>
                    <textarea
                      rows={2}
                      value={formSeoDesc}
                      onChange={(e) => setFormSeoDesc(e.target.value)}
                      placeholder="Whisper-quiet ceramic aroma diffuser..."
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  isLoading={isSaving}
                >
                  {editingProduct ? "Save Product" : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profit Margin Calculator Modal */}
      {selectedProductForCalc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
            onClick={() => setSelectedProductForCalc(null)}
          />

          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
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
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-neutral-900 dark:text-white block">
                  {selectedProductForCalc.name}
                </span>
                <span className="text-[10px] text-neutral-400">
                  PID: {selectedProductForCalc.cjProductId || "N/A"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Selling Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcSellingPrice}
                    onChange={(e) => setCalcSellingPrice(Number(e.target.value))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Supplier Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcCostPrice}
                    onChange={(e) => setCalcCostPrice(Number(e.target.value))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Estimated Shipping ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calcShippingCost}
                    onChange={(e) => setCalcShippingCost(Number(e.target.value))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Payment Gateway Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcPaymentFee}
                    onChange={(e) => setCalcPaymentFee(Number(e.target.value))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Profit summary */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Costs:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatMoney(
                      calculation.costPrice +
                        calculation.shippingCost +
                        calculation.estimatedPaymentFee +
                        calculation.estimatedTax,
                      "USD"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Net Profit Per Unit:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {formatMoney(calculation.netProfit, "USD")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-900 dark:text-white">Profit Margin:</span>
                  <span
                    className={`font-black text-base ${
                      calculation.isBelowThreshold
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {calculation.marginPercent}%
                  </span>
                </div>
              </div>

              {calculation.isBelowThreshold && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Warning: Margin is below the store minimum 35% threshold. Consider increasing selling price.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
