"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, AlertCircle } from "lucide-react";
import { getCategories } from "@/lib/db/categories";
import { getProductById, adminUpdateProduct } from "@/lib/db/products";
import { SeedCategory, SeedProduct } from "@/lib/db/seed-data";
import { Button } from "@/components/ui/Button";

interface AdminEditProductPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminEditProductPage({ params }: AdminEditProductPageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  const [categories, setCategories] = useState<SeedCategory[]>([]);
  const [product, setProduct] = useState<SeedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"published" | "draft" | "archived">("published");
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [basePrice, setBasePrice] = useState(0);
  const [compareAtPrice, setCompareAtPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function loadData() {
      const [cats, prod] = await Promise.all([
        getCategories(),
        getProductById(productId),
      ]);
      setCategories(cats);

      if (prod) {
        setProduct(prod);
        setName(prod.name);
        setSlug(prod.slug);
        setCategoryId(prod.categoryId);
        setBrandName(prod.brandName);
        setShortDescription(prod.shortDescription);
        setDescription(prod.description);
        setStatus(prod.status as any);
        setFeatured(prod.featured);
        setBestseller(prod.bestseller);
        setNewArrival(prod.newArrival);
        setBasePrice(prod.basePrice);
        setCompareAtPrice(prod.compareAtPrice);
      }
      setLoading(false);
    }

    loadData();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      await adminUpdateProduct(productId, {
        name,
        slug,
        categoryId,
        brandName,
        shortDescription,
        description,
        status,
        featured,
        bestseller,
        newArrival,
        basePrice,
        compareAtPrice,
      });

      router.push("/admin/products");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update product.";
      setErrorMsg(msg);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-neutral-400">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold">Product not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

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
          Edit Product: {product.name}
        </h1>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Product Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Slug</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Brand</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Base Price ($ USD)</label>
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
              <label className="block text-xs font-semibold text-neutral-500 mb-1">Compare Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={compareAtPrice ?? ""}
                onChange={(e) => setCompareAtPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              <span>Featured</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={bestseller}
                onChange={(e) => setBestseller(e.target.checked)}
              />
              <span>Best Seller</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={newArrival}
                onChange={(e) => setNewArrival(e.target.checked)}
              />
              <span>New Arrival</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="md" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
