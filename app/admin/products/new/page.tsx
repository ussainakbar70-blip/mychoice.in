"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { getCategories } from "@/lib/db/categories";
import { adminCreateProduct } from "@/lib/db/products";
import { SeedCategory } from "@/lib/db/seed-data";
import { Button } from "@/components/ui/Button";

export default function AdminNewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<SeedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Product fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("MYCHOICE");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(true);
  const [basePrice, setBasePrice] = useState(49.0);
  const [compareAtPrice, setCompareAtPrice] = useState<number | undefined>(69.0);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [primaryImage, setPrimaryImage] = useState(
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80"
  );

  // Variant fields
  const [variants, setVariants] = useState<
    Array<{
      sku: string;
      price: number;
      compareAtPrice?: number;
      costPrice: number;
      shippingCost: number;
      inventoryQuantity: number;
      option1Name: string;
      option1Value: string;
    }>
  >([
    {
      sku: "MY-NEW-01",
      price: 49.0,
      compareAtPrice: 69.0,
      costPrice: 16.0,
      shippingCost: 4.5,
      inventoryQuantity: 50,
      option1Name: "Standard",
      option1Value: "Default",
    },
  ]);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    });
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: `MY-SKU-${Date.now().toString().slice(-4)}`,
        price: basePrice,
        costPrice: 15.0,
        shippingCost: 4.0,
        inventoryQuantity: 30,
        option1Name: "Color / Size",
        option1Value: "Variant",
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim() || !slug.trim()) {
      setErrorMsg("Please provide a product title and unique slug.");
      return;
    }

    setLoading(true);

    try {
      await adminCreateProduct({
        name: name.trim(),
        slug: slug.trim(),
        categoryId,
        brandName,
        shortDescription,
        description,
        status,
        featured,
        bestseller,
        newArrival,
        basePrice,
        compareAtPrice: compareAtPrice || undefined,
        seoTitle: seoTitle || name,
        seoDescription: seoDescription || shortDescription,
        images: [
          {
            publicUrl: primaryImage,
            altText: name,
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        variants: variants.map((v) => ({
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          costPrice: v.costPrice,
          shippingCost: v.shippingCost,
          inventoryQuantity: v.inventoryQuantity,
          option1Name: v.option1Name,
          option1Value: v.option1Value,
        })),
      });

      router.push("/admin/products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create product.";
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Product Catalog</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Create New Product
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure merchandising metadata, multi-tier variants, supplier costs, and SEO properties.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Info */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Core Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Product Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Ergonomic Pour-Over Kettle"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ergonomic-pour-over-kettle"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Publish Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="One line essence of the product"
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Full Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed craftsmanship, materials, and usage details..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
            />
          </div>
        </div>

        {/* Pricing & Merchandising */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Pricing &amp; Merchandising Flags
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Base Selling Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Compare-at Price ($ USD, Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={compareAtPrice ?? ""}
                onChange={(e) => setCompareAtPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g. 79.00"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span>Featured on Homepage</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={bestseller}
                onChange={(e) => setBestseller(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span>Mark as Best Seller</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={newArrival}
                onChange={(e) => setNewArrival(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span>Mark as New Arrival</span>
            </label>
          </div>
        </div>

        {/* Media */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            Primary Imagery
          </h2>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Image URL (Unsplash or Supabase Storage)
            </label>
            <input
              type="url"
              required
              value={primaryImage}
              onChange={(e) => setPrimaryImage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
            />
          </div>
        </div>

        {/* Variants */}
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Product Variants ({variants.length})
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddVariant} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Variant
            </Button>
          </div>

          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={i} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Variant #{i + 1}
                  </span>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(i)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">SKU</label>
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].sku = e.target.value;
                        setVariants(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Option Name</label>
                    <input
                      type="text"
                      value={v.option1Name}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].option1Name = e.target.value;
                        setVariants(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Option Value</label>
                    <input
                      type="text"
                      value={v.option1Value}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].option1Value = e.target.value;
                        setVariants(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">Inventory Qty</label>
                    <input
                      type="number"
                      value={v.inventoryQuantity}
                      onChange={(e) => {
                        const copy = [...variants];
                        copy[i].inventoryQuantity = parseInt(e.target.value) || 0;
                        setVariants(copy);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="md" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
            Publish Product
          </Button>
        </div>
      </form>
    </div>
  );
}
