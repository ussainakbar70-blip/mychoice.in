"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag, Tag, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { SITE_CONFIG } from "@/lib/config/site";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { items, itemCount, subtotal, currency, updateQuantity, removeItem, clearCart } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState("");

  const freeShippingThreshold = SITE_CONFIG.thresholds.freeShippingUsd;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const standardShipping = isFreeShipping ? 0 : 9.95;

  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount + standardShipping);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const code = couponInput.trim().toUpperCase();

    if (code === "WELCOME10") {
      setAppliedCoupon({ code, discountPercent: 10 });
      setCouponInput("");
    } else if (code === "LUXURY25") {
      if (subtotal < 200) {
        setCouponError("LUXURY25 requires orders exceeding $200.");
      } else {
        setAppliedCoupon({ code, discountPercent: 25 });
        setCouponInput("");
      }
    } else {
      setCouponError("Invalid or expired promotional code.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="max-w-md mx-auto space-y-5">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-400">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Your shopping bag is empty
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            Your bag is awaiting curated essentials. Explore our modern design collections.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="lg">
              <Link href="/shop">Start Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <div className="flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Shopping Bag
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {itemCount} {itemCount === 1 ? "item" : "items"} ready for checkout
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-neutral-500 hover:text-rose-500 transition-colors"
        >
          Clear Bag
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items Table (8 Cols) */}
        <div className="lg:col-span-8 divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((item) => (
            <div key={item.variantId} className="py-6 flex gap-4 sm:gap-6 items-start">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-white">
                      {item.name}
                    </h3>
                    {item.variantName && (
                      <p className="text-xs text-neutral-500">{item.variantName}</p>
                    )}
                    <p className="text-[11px] font-mono text-neutral-400 mt-0.5">SKU: {item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {/* Stepper */}
                  <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-semibold text-neutral-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-neutral-900 dark:text-white">
                      {formatMoney(item.price * item.quantity, currency)}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[11px] text-neutral-400 block">
                        ({formatMoney(item.price, currency)} each)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Card (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-6 sticky top-28">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Order Summary
            </h2>

            {/* Price Lines */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatMoney(subtotal, currency)}
                </span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>-{formatMoney(discountAmount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Shipping</span>
                <span>
                  {isFreeShipping ? (
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[10px]">
                      FREE
                    </strong>
                  ) : (
                    formatMoney(standardShipping, currency)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between text-sm font-bold text-neutral-900 dark:text-white">
                <span>Estimated Total</span>
                <span className="text-lg">{formatMoney(estimatedTotal, currency)}</span>
              </div>
            </div>

            {/* Promo Code Form */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.discountPercent}% off)</span>
                  </div>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-neutral-400 hover:text-neutral-700 text-[10px] uppercase font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white uppercase placeholder:normal-case focus:outline-none"
                    />
                    <Button variant="secondary" size="sm" type="submit">
                      Apply
                    </Button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-500">{couponError}</p>}
                </form>
              )}
            </div>

            {/* Checkout Action */}
            <Button
              variant="primary"
              size="lg"
              className="w-full text-sm font-semibold shadow-lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              <Link href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ""}`} className="w-full text-center">
                Proceed to Checkout
              </Link>
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Authoritative 256-Bit SSL Encrypted Processing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
