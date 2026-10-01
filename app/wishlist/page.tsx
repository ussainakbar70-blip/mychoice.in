"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { getWishlistProductIds, toggleWishlistItem } from "@/lib/db/wishlist";
import { getProducts } from "@/lib/db/products";
import { SeedProduct } from "@/lib/db/seed-data";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

export default function WishlistPage() {
  const { addItem, currency } = useCart();
  const [products, setProducts] = useState<SeedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const ids = await getWishlistProductIds();
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const all = await getProducts({ status: "published", limit: 100 });
      const matched = all.products.filter((p) => ids.includes(p.id));
      setProducts(matched);
    } catch (err) {
      console.error("Failed to load wishlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();

    const handleUpdate = () => {
      loadWishlist();
    };

    window.addEventListener("wishlist_updated", handleUpdate);
    return () => window.removeEventListener("wishlist_updated", handleUpdate);
  }, []);

  const handleRemove = async (productId: string) => {
    await toggleWishlistItem(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleMoveToCart = (product: SeedProduct) => {
    const variant = product.variants[0];
    if (!variant) return;

    addItem({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      variantName: variant.option1Value ? `${variant.option1Name}: ${variant.option1Value}` : undefined,
      price: variant.price,
      image: product.images[0]?.publicUrl || "",
      sku: variant.sku,
    });

    handleRemove(product.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
            Personal Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
            My Wishlist ({products.length})
          </h1>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/shop" className="inline-flex items-center gap-1.5">
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const variant = product.variants[0];
            const inStock = (variant?.inventoryQuantity ?? 0) > 0;

            return (
              <div
                key={product.id}
                className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={product.images[0]?.publicUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-neutral-900/90 text-neutral-500 hover:text-red-500 backdrop-blur-sm transition-colors shadow-sm"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                      {product.brandName}
                    </span>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2">
                      <Link href={`/product/${product.slug}`} className="hover:text-brand-gold">
                        {product.name}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {formatMoney(product.basePrice, currency)}
                      </span>
                      {product.compareAtPrice && (
                        <span className="text-xs text-neutral-400 line-through">
                          {formatMoney(product.compareAtPrice, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!inStock}
                    onClick={() => handleMoveToCart(product)}
                    className="w-full text-xs font-semibold"
                    leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                  >
                    {inStock ? "Move to Bag" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Save your favorite design pieces and everyday essentials here to revisit or purchase later.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="md" asChild>
              <Link href="/shop">Discover Curated Catalog</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
