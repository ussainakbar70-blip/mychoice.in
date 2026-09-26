"use client";

import React from "react";
import Link from "next/link";
import { Star, ShoppingBag, Heart } from "lucide-react";
import { SeedProduct } from "@/lib/db/seed-data";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";

interface ProductCardProps {
  product: SeedProduct;
  priority?: boolean;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, currency } = useCart();
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const secondaryImage = product.images.find((img) => !img.isPrimary);
  const defaultVariant = product.variants[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!defaultVariant) return;

    addItem({
      variantId: defaultVariant.id,
      productId: product.id,
      name: product.name,
      variantName: defaultVariant.option1Value
        ? `${defaultVariant.option1Name}: ${defaultVariant.option1Value}`
        : undefined,
      price: defaultVariant.price,
      image: primaryImage?.publicUrl || "",
      sku: defaultVariant.sku,
    });
  };

  return (
    <div className="group relative flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden hover:shadow-card-hover transition-all duration-300">
      {/* Image Container with Badges */}
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-square w-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden block"
      >
        <img
          src={primaryImage?.publicUrl}
          alt={primaryImage?.altText || product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {secondaryImage && (
          <img
            src={secondaryImage.publicUrl}
            alt={secondaryImage.altText || product.name}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
            loading="lazy"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.bestseller && <Badge variant="gold">Best Seller</Badge>}
          {product.newArrival && <Badge variant="default">New</Badge>}
          {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
            <Badge variant="outline" className="bg-white/90 dark:bg-neutral-900/90">
              Save {Math.round(((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100)}%
            </Badge>
          )}
        </div>

        {/* Quick Add Overlay Button on Hover */}
        <button
          onClick={handleQuickAdd}
          className="absolute bottom-3 right-3 p-3 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-105"
          aria-label="Quick add to bag"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>
      </Link>

      {/* Product Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Rating */}
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {product.brandName}
            </span>
            {product.productRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {product.productRating.toFixed(1)}
                </span>
                <span className="text-[11px] text-neutral-400">({product.reviewCount})</span>
              </div>
            )}
          </div>

          {/* Title */}
          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-brand-gold transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Short description */}
          <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* Price Row */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-neutral-900 dark:text-white">
              {formatMoney(product.basePrice, currency)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatMoney(product.compareAtPrice, currency)}
              </span>
            )}
          </div>

          <span className="text-[11px] font-medium text-neutral-500">
            {product.variants.length > 1 ? `${product.variants.length} styles` : "In Stock"}
          </span>
        </div>
      </div>
    </div>
  );
}
