"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Truck, AlertCircle, ArrowLeft, Check } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { SITE_CONFIG } from "@/lib/config/site";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponFromQuery = searchParams.get("coupon") || "";
  const { items, subtotal, currency, clearCart } = useCart();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [countryCode, setCountryCode] = useState("IN");
  const [couponCode, setCouponCode] = useState(couponFromQuery);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize unique idempotency key per checkout attempt
  useEffect(() => {
    setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const freeShippingThreshold = SITE_CONFIG.thresholds.freeShippingUsd;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingAmount = isFreeShipping ? 0 : 9.95;

  // Rough estimation for display; authoritative total is verified on the server!
  const estimatedTotal = subtotal + shippingAmount;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Your Bag is Empty</h1>
        <p className="text-xs text-neutral-500">Add curated essentials to your bag to proceed with checkout.</p>
        <Button variant="primary" size="md">
          <Link href="/shop">Explore Collections</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const payload = {
        email,
        shippingAddress: {
          fullName,
          phone,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          postalCode,
          country,
          countryCode,
        },
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        couponCode: couponCode || undefined,
        currency,
        idempotencyKey,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Checkout could not be completed. Please review your details.");
        setIsSubmitting(false);
        return;
      }

      // Order successfully confirmed
      clearCart();
      router.push(data.redirectUrl || `/order/success?order_number=${data.orderNumber}`);
    } catch {
      setErrorMessage("Network error occurred during order confirmation. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20">
      {/* Checkout Minimal Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to shopping bag</span>
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-8 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Form: Contact & Shipping (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Contact Details */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                1. Contact Information
              </h2>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address (for order tracking &amp; confirmation)
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="e.g. alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                2. Shipping Destination
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone (Required for courier dispatch)
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  autoComplete="address-line1"
                  placeholder="House/Apartment number, street name"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  autoComplete="address-line2"
                  placeholder="Floor, suite, building details"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="address-level2"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="address-level1"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="postal-code"
                    placeholder="e.g. 400001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Country Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 text-xs font-mono uppercase rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                3. Payment Method
              </h2>
              <div className="p-4 rounded-xl border-2 border-neutral-900 dark:border-brand-gold bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-brand-gold flex items-center justify-center text-white dark:text-neutral-950 text-[10px] font-bold">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Instant Secure Checkout (Sandbox Test / Production Adapter)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Live Encrypted</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed pl-6">
                  Payment is abstracted through our verified PaymentProvider adapter. In development mode,
                  this securely records the order and synchronizes fulfillment without requiring live credit card entry.
                </p>
              </div>
            </div>
          </div>

          {/* Right Summary: Items & Total (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 sticky top-8">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Order Review ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>

              {/* Items List */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.variantId} className="py-3 flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-800 text-white text-[9px] font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      {item.variantName && (
                        <p className="text-[10px] text-neutral-500">{item.variantName}</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white shrink-0">
                      {formatMoney(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Shipping</span>
                  <span>
                    {isFreeShipping ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]">
                        FREE
                      </span>
                    ) : (
                      formatMoney(shippingAmount, currency)
                    )}
                  </span>
                </div>
                <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 flex justify-between text-sm font-bold text-neutral-900 dark:text-white">
                  <span>Total</span>
                  <span className="text-lg">{formatMoney(estimatedTotal, currency)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                variant="gold"
                size="lg"
                type="submit"
                isLoading={isSubmitting}
                className="w-full font-bold shadow-lg"
              >
                Place Order • {formatMoney(estimatedTotal, currency)}
              </Button>

              <div className="space-y-2 pt-1 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Authoritative server pricing &amp; double-submit idempotency protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                  <span>Direct automated fulfillment sync with CJdropshipping</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-neutral-400">Loading secure checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
