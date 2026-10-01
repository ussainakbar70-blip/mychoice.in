"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Truck, AlertCircle, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart/context";
import { formatMoney } from "@/lib/currency";
import { SITE_CONFIG } from "@/lib/config/site";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

type PaymentStage = "idle" | "creating_order" | "opening_gateway" | "verifying_payment" | "confirmed";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}


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
  const [country, setCountry] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [couponCode, setCouponCode] = useState(couponFromQuery);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const [paymentStage, setPaymentStage] = useState<PaymentStage>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize unique idempotency key per checkout attempt
  useEffect(() => {
    setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  const freeShippingThreshold = SITE_CONFIG.thresholds.freeShippingUsd;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingAmount = isFreeShipping ? 0 : 9.95;
  const estimatedTotal = subtotal + shippingAmount;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Your Bag is Empty</h1>
        <p className="text-xs text-neutral-500">Add curated essentials to your bag to proceed with checkout.</p>
        <Button variant="primary" size="md" asChild>
          <Link href="/shop">Explore Collections</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setPaymentStage("creating_order");

    try {
      // 1. Create Server-Authoritative Payment Order
      const currencyToUse = currency || "USD";
      const payload = {
        email: email.trim() || undefined,
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
        currency: currencyToUse,
        idempotencyKey,
      };

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        setErrorMessage(orderData.error || "Failed to create secure payment order.");
        setPaymentStage("idle");
        return;
      }

      const { checkout, orderId, orderNumber } = orderData;

      // 2. Gateway Dispatch: Razorpay vs Mock/Development Provider
      if (checkout.provider === "mock" || checkout.provider === "development") {
        // Direct sandbox flow for testing / dev
        setPaymentStage("verifying_payment");
        const verifyRes = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            providerOrderId: checkout.providerOrderId,
            providerPaymentId: `pay_mock_${Date.now()}`,
            providerSignature: "mock_sig_valid",
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          setErrorMessage(verifyData.error || "Simulated payment verification failed.");
          setPaymentStage("idle");
          return;
        }

        setPaymentStage("confirmed");
        clearCart();
        router.push(verifyData.redirectUrl || `/checkout/success?order_number=${orderNumber}`);
        return;
      }

      // Cashfree PG Modal Flow
      if (checkout.provider === "cashfree") {
        setPaymentStage("opening_gateway");
        const isLoaded = await loadCashfreeScript();
        if (!isLoaded || !(window as any).Cashfree) {
          setErrorMessage("Payment gateway failed to load. Please check your connection or ad-blocker.");
          setPaymentStage("idle");
          return;
        }

        if (!checkout.paymentSessionId) {
          setErrorMessage("Payment session could not be established. Please retry.");
          setPaymentStage("idle");
          return;
        }

        const isSandbox = !checkout.mode || checkout.mode === "test" || checkout.mode === "sandbox";
        const cashfree = (window as any).Cashfree({
          mode: isSandbox ? "sandbox" : "production",
        });

        cashfree
          .checkout({
            paymentSessionId: checkout.paymentSessionId,
            redirectTarget: "_modal",
          })
          .then(async (result: any) => {
            if (result.error) {
              setPaymentStage("idle");
              setErrorMessage(result.error.message || "Payment attempt failed or was cancelled.");
              return;
            }
            if (result.redirect) {
              return;
            }

            setPaymentStage("verifying_payment");
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  providerOrderId: checkout.providerOrderId,
                  providerPaymentId: result.paymentDetails?.paymentMessage || checkout.providerOrderId,
                  providerSignature: "cf_verified",
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                setErrorMessage(verifyData.error || "Payment verification failed on server.");
                setPaymentStage("idle");
                router.push(
                  `/checkout/payment-failed?order_number=${orderNumber}&reason=${encodeURIComponent(
                    verifyData.error || "Verification failed"
                  )}`
                );
                return;
              }

              setPaymentStage("confirmed");
              clearCart();
              router.push(verifyData.redirectUrl || `/checkout/success?order_number=${orderNumber}`);
            } catch {
              setErrorMessage("Network error during payment verification.");
              setPaymentStage("idle");
            }
          })
          .catch((cfErr: any) => {
            setPaymentStage("idle");
            setErrorMessage(cfErr?.message || "Cashfree payment modal encountered an issue.");
          });
        return;
      }

      // Live / Test Razorpay Modal Flow
      setPaymentStage("opening_gateway");
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        setErrorMessage("Payment gateway failed to load. Please check your connection or ad-blocker.");
        setPaymentStage("idle");
        return;
      }

      const razorpayOptions = {
        key: checkout.keyId,
        amount: checkout.amountMinor,
        currency: checkout.currency,
        name: "MYCHOICE.in",
        description: `Order ${checkout.orderNumber}`,
        order_id: checkout.providerOrderId,
        prefill: {
          name: checkout.customer.name,
          email: checkout.customer.email,
          contact: checkout.customer.contact,
        },
        theme: {
          color: "#0a0a0a",
        },
        handler: async (response: any) => {
          setPaymentStage("verifying_payment");
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                providerOrderId: response.razorpay_order_id,
                providerPaymentId: response.razorpay_payment_id,
                providerSignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              setErrorMessage(verifyData.error || "Payment verification failed on server.");
              setPaymentStage("idle");
              router.push(`/checkout/payment-failed?order_number=${orderNumber}&reason=${encodeURIComponent(verifyData.error || "Verification failed")}`);
              return;
            }

            setPaymentStage("confirmed");
            clearCart();
            router.push(verifyData.redirectUrl || `/checkout/success?order_number=${orderNumber}`);
          } catch {
            setErrorMessage("Network error during payment verification.");
            setPaymentStage("idle");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentStage("idle");
            setErrorMessage("Payment was dismissed. You can review your details and try again.");
          },
        },
      };

      const rzp = new (window as any).Razorpay(razorpayOptions);
      rzp.on("payment.failed", (resp: any) => {
        setPaymentStage("idle");
        const reason = resp.error?.description || "Payment was declined by your bank or gateway.";
        router.push(`/checkout/payment-failed?order_number=${orderNumber}&reason=${encodeURIComponent(reason)}`);
      });
      rzp.open();
    } catch {
      setErrorMessage("An unexpected error occurred during checkout. Please try again.");
      setPaymentStage("idle");
    }
  };

  const getButtonText = () => {
    switch (paymentStage) {
      case "creating_order":
        return "Creating secure payment...";
      case "opening_gateway":
        return "Opening payment gateway...";
      case "verifying_payment":
        return "Verifying payment...";
      case "confirmed":
        return "Order confirmed";
      default:
        return `Pay ${formatMoney(estimatedTotal, currency || "USD")}`;
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

        {/* Verification in Progress Alert */}
        {paymentStage === "verifying_payment" && (
          <div className="mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5 shadow-sm">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span className="font-semibold">Your payment is being verified by our server. Please don&apos;t close this page.</span>
          </div>
        )}

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
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  1. Contact Information
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> Guest Checkout (No password required)
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address <span className="text-neutral-400 font-normal">(Optional — for order receipt & tracking)</span>
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Shipping Details */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  2. Shipping Address
                </h2>
                <span className="text-[11px] text-neutral-400 font-medium">Worldwide Courier Dispatch</span>
              </div>

              {/* Country Selection */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Country / Destination
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCountryCode(code);
                    if (code === "US") setCountry("United States");
                    else if (code === "IN") setCountry("India");
                    else if (code === "GB") setCountry("United Kingdom");
                    else if (code === "CA") setCountry("Canada");
                    else if (code === "AU") setCountry("Australia");
                    else if (code === "DE") setCountry("Germany");
                    else if (code === "FR") setCountry("France");
                    else setCountry("United States");
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                >
                  <option value="US">United States (USD)</option>
                  <option value="IN">India (INR)</option>
                  <option value="CA">Canada (CAD / USD)</option>
                  <option value="GB">United Kingdom (GBP)</option>
                  <option value="AU">Australia (AUD / USD)</option>
                  <option value="DE">Germany (EUR)</option>
                  <option value="FR">France (EUR)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Recipient's Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span> <span className="text-neutral-400 font-normal">(for tracking updates)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder={countryCode === "US" ? "+1 (555) 019-2834" : "e.g. 9876543210"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
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
                  autoComplete="street-address"
                  placeholder={countryCode === "US" ? "e.g. 742 Evergreen Terrace" : "Flat, House no., Building, Street"}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Apartment, Suite, Unit <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Apt 4B, Suite 200 (optional)"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
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
                    placeholder={countryCode === "US" ? "e.g. Springfield" : "City"}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="address-level1"
                    placeholder={countryCode === "US" ? "e.g. Oregon or OR" : "State"}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {countryCode === "US" ? "ZIP Code" : "Postal Code"}
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="postal-code"
                    placeholder={countryCode === "US" ? "e.g. 97477" : "PIN Code"}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                3. Secure Payment Gateway
              </h2>
              <div className="p-4 rounded-xl border-2 border-neutral-900 dark:border-brand-gold bg-neutral-50 dark:bg-neutral-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-neutral-900 dark:bg-brand-gold flex items-center justify-center text-white dark:text-neutral-950 text-[10px] font-bold">
                      ✓
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Cashfree Secure Gateway (UPI, Cards, NetBanking, Wallets)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    256-Bit SSL
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed pl-6">
                  Payments are processed through PCI-DSS Level 1 certified gateway. Your card or UPI details are never stored on our servers.
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
                  <span>Total Due</span>
                  <span className="text-lg">{formatMoney(estimatedTotal, currency)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                variant="gold"
                size="lg"
                type="submit"
                isLoading={paymentStage !== "idle" && paymentStage !== "confirmed"}
                disabled={paymentStage !== "idle"}
                className="w-full font-bold shadow-lg"
              >
                {getButtonText()}
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
