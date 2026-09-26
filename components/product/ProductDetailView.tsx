"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  ChevronDown,
  Share2,
} from "lucide-react";
import { SeedProduct, SeedVariant } from "@/lib/db/seed-data";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ProductDetailViewProps {
  product: SeedProduct;
  relatedProducts: SeedProduct[];
}

export function ProductDetailView({ product, relatedProducts }: ProductDetailViewProps) {
  const { addItem, currency } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<SeedVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("specs");
  const [isAdding, setIsAdding] = useState(false);

  const currentPrice = selectedVariant?.price ?? product.basePrice;
  const currentCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const inStock = (selectedVariant?.inventoryQuantity ?? 0) > 0;

  const handleAddToCart = () => {
    if (!selectedVariant || !inStock) return;
    setIsAdding(true);

    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        name: product.name,
        variantName: selectedVariant.option1Value
          ? `${selectedVariant.option1Name}: ${selectedVariant.option1Value}`
          : undefined,
        price: selectedVariant.price,
        image: product.images[selectedImageIndex]?.publicUrl || product.images[0]?.publicUrl,
        sku: selectedVariant.sku,
      },
      quantity
    );

    setTimeout(() => setIsAdding(false), 400);
  };

  const toggleAccordion = (key: string) => {
    setActiveAccordion(activeAccordion === key ? null : key);
  };

  return (
    <div className="space-y-16 lg:space-y-24">
      {/* Product Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Product Imagery Gallery (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Hero Image */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800/80">
            <img
              src={product.images[selectedImageIndex]?.publicUrl}
              alt={product.images[selectedImageIndex]?.altText || product.name}
              className="w-full h-full object-cover object-center transition-all duration-300"
            />
            {product.bestseller && (
              <div className="absolute top-4 left-4">
                <Badge variant="gold">Best Seller</Badge>
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImageIndex === idx
                      ? "border-neutral-900 dark:border-white shadow-md"
                      : "border-neutral-200 dark:border-neutral-800 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.publicUrl} alt={img.altText} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Buy Box & Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Brand & Rating */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-500">
                {product.brandName}
              </span>
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-2 rounded-full border transition-colors ${
                  isWishlisted
                    ? "border-rose-200 text-rose-500 bg-rose-50 dark:bg-rose-950/30"
                    : "border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-800"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500" : ""}`} />
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white leading-snug">
              {product.name}
            </h1>

            {product.productRating > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(product.productRating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {product.productRating.toFixed(1)}
                </span>
                <span className="text-neutral-400">({product.reviewCount} verified reviews)</span>
              </div>
            )}
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200/60 dark:border-neutral-800/60">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              {formatMoney(currentPrice, currency)}
            </span>
            {currentCompareAt && currentCompareAt > currentPrice && (
              <>
                <span className="text-sm text-neutral-400 line-through">
                  {formatMoney(currentCompareAt, currency)}
                </span>
                <Badge variant="gold">
                  Save {Math.round(((currentCompareAt - currentPrice) / currentCompareAt) * 100)}%
                </Badge>
              </>
            )}
          </div>

          {/* Short description */}
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {product.description}
          </p>

          {/* Variant Selection */}
          {product.variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {selectedVariant?.option1Name || "Variant"}:
                </span>
                <span className="text-neutral-500 font-medium">
                  {selectedVariant?.option1Value}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950 shadow-sm"
                          : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                      }`}
                    >
                      {v.option1Value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock & Quantity Row */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                In Stock &amp; Ready to Dispatch ({selectedVariant?.inventoryQuantity || 100}+ units available)
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Stepper */}
              <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-semibold text-neutral-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                variant="primary"
                size="lg"
                isLoading={isAdding}
                onClick={handleAddToCart}
                className="flex-1 text-sm font-semibold shadow-lg"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
              >
                Add To Bag • {formatMoney(currentPrice * quantity, currency)}
              </Button>
            </div>
          </div>

          {/* Shipping & Delivery Guarantee Banner */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
              <Truck className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong>Tracked Express Courier</strong>: Estimated arrival in <strong>5–9 business days</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-800 dark:text-neutral-200">
              <RotateCcw className="w-4 h-4 text-brand-gold shrink-0" />
              <span>
                <strong>30-Day Guarantee</strong>: Free returns and exchanges if not 100% delighted.
              </span>
            </div>
          </div>

          {/* Product Details Accordion */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {/* Specs Accordion */}
            <div>
              <button
                onClick={() => toggleAccordion("specs")}
                className="w-full py-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white"
              >
                <span>Specifications & Dimensions</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    activeAccordion === "specs" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeAccordion === "specs" && (
                <div className="pb-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-850">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">SKU</span>
                    <span className="font-mono text-[11px]">{selectedVariant?.sku}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Features Accordion */}
            <div>
              <button
                onClick={() => toggleAccordion("features")}
                className="w-full py-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white"
              >
                <span>Key Features & Craft</span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform ${
                    activeAccordion === "features" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {activeAccordion === "features" && (
                <div className="pb-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
                  {product.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-brand-gold mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Verified Customer Reviews Section */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 pt-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-500">
              Verified Feedback
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
              Client Reviews ({product.reviewCount})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
              {product.productRating.toFixed(1)}
            </span>
            <div className="text-xs text-neutral-500">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p>Based on verified deliveries</p>
            </div>
          </div>
        </div>

        {/* Reviews Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-neutral-400">2 weeks ago</span>
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Remarkable tactile quality and finish.
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Arrived in clean, minimal packaging. The materials feel substantial and premium in the hand.
              Exceeded my expectations compared to ordinary online stores.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">Aarav M.</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Verified Buyer
              </span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs text-neutral-400">1 month ago</span>
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Exactly as pictured, fast tracked delivery.
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The tracking updates kept me informed from dispatch to doorstep. The finish has that
              understated, elegant Scandinavian look I wanted.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">Elena S.</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Verified Buyer
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden p-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-neutral-500 block">Total</span>
          <span className="text-base font-bold text-neutral-900 dark:text-white">
            {formatMoney(currentPrice * quantity, currency)}
          </span>
        </div>
        <Button
          variant="primary"
          size="md"
          isLoading={isAdding}
          onClick={handleAddToCart}
          className="flex-1"
          leftIcon={<ShoppingBag className="w-4 h-4" />}
        >
          Add to Bag
        </Button>
      </div>
    </div>
  );
}
