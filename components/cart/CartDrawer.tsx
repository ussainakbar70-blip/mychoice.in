"use client";

import React from "react";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { SITE_CONFIG } from "@/lib/config/site";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

export function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    currency,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  const freeShippingThreshold = SITE_CONFIG.thresholds.freeShippingUsd;
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeCartDrawer}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-neutral-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
                Your Bag ({itemCount})
              </h2>
            </div>
            <button
              onClick={closeCartDrawer}
              className="p-2 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
            <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium mb-1.5 flex justify-between">
              {remainingForFreeShipping > 0 ? (
                <>
                  <span>Add <strong className="text-brand-dark dark:text-white font-semibold">{formatMoney(remainingForFreeShipping, currency)}</strong> for free shipping</span>
                  <span>{Math.round(progressPercent)}%</span>
                </>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  You unlocked Complimentary Express Shipping!
                </span>
              )}
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-neutral-900 dark:bg-brand-gold h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                  Your bag is empty
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6">
                  Explore our curated collections of elevated essentials crafted for intentional living.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    closeCartDrawer();
                  }}
                >
                  <Link href="/shop">Explore Collection</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.variantId} className="py-4 flex gap-4">
                  <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.variantName && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {item.variantName}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-md">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold px-2.5 py-0.5 text-neutral-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {formatMoney(item.price * item.quantity, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Subtotal</span>
                <span className="text-base font-bold text-neutral-900 dark:text-white">
                  {formatMoney(subtotal, currency)}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Shipping, duties, and promotional discounts calculated at checkout.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={closeCartDrawer}
                >
                  <Link href="/cart" className="w-full text-center">
                    View Bag
                  </Link>
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={closeCartDrawer}
                >
                  <Link href="/checkout" className="w-full text-center">
                    Checkout
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
