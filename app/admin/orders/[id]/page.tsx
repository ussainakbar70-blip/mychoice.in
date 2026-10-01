"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Truck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Package,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { getOrderSecure, adminUpdateOrderStatus, DetailedOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/currency";
import { formatINR } from "@/lib/payments/money";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const resolvedParams = use(params);
  const orderIdentifier = resolvedParams.id;
  const router = useRouter();

  const [order, setOrder] = useState<DetailedOrder | null>(null);
  const [payment, setPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Editable fields
  const [orderStatus, setOrderStatus] = useState<string>("confirmed");
  const [paymentStatus, setPaymentStatus] = useState<string>("pending_payment");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>("unfulfilled");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [trackingUrl, setTrackingUrl] = useState<string>("");

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const found = await getOrderSecure(orderIdentifier, { isAdmin: true });
        if (found) {
          setOrder(found);
          setOrderStatus(found.orderStatus);
          setPaymentStatus(found.paymentStatus);
          setFulfillmentStatus(found.fulfillmentStatus);
          setInternalNotes(found.internalNotes || "");
          setTrackingNumber(found.trackingNumber || "");
          setTrackingUrl(found.trackingUrl || "");

          // Fetch linked payment record
          try {
            const payRes = await fetch(`/api/admin/payments?search=${found.orderNumber}`);
            const payData = await payRes.json();
            if (payData.success && payData.payments?.length > 0) {
              setPayment(payData.payments[0]);
            }
          } catch {
            // Non-fatal
          }
        } else {
          setErrorMsg("Order not found.");
        }
      } catch {
        setErrorMsg("Failed to load order.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderIdentifier]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const updated = await adminUpdateOrderStatus(order.id, {
        orderStatus,
        paymentStatus,
        fulfillmentStatus,
        internalNotes,
        trackingNumber: trackingNumber || undefined,
        trackingUrl: trackingUrl || undefined,
      });

      if (updated) {
        setOrder(updated);
        setSuccessMsg("Order status and internal records updated successfully.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-neutral-400">Loading order management...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold">{errorMsg || "Order not found."}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Orders List</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-mono">
              {order.orderNumber}
            </h1>
            <Badge
              variant={
                order.paymentStatus === "paid"
                  ? "success"
                  : order.paymentStatus === "failed"
                  ? "danger"
                  : "neutral"
              }
            >
              Payment: {order.paymentStatus}
            </Badge>
            <Badge variant="outline">Fulfillment: {order.fulfillmentStatus}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/payments?search=${order.orderNumber}`} className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>View in Payment Ledger</span>
            </Link>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Items, Financials & Customer Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: ORDER ITEMS & FINANCIALS */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-gold" />
              Order Items ({order.items.length})
            </h2>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {item.productName}
                    </h3>
                    {item.variantName && (
                      <span className="text-neutral-400 text-[11px] block">{item.variantName}</span>
                    )}
                    <span className="font-mono text-[10px] text-neutral-400">SKU: {item.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Qty {item.quantity} × {formatINR(item.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs text-neutral-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatINR(order.discountAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatINR(order.shippingAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatINR(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-900 dark:text-white">
                <span>Grand Total</span>
                <span className="text-brand-gold">{formatINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 text-xs shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Customer Shipping Address
            </h2>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 leading-relaxed text-neutral-700 dark:text-neutral-300">
              <strong className="text-neutral-900 dark:text-white block">
                {order.shippingAddress.fullName}
              </strong>
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country} ({order.shippingAddress.countryCode}) • Phone: {order.shippingAddress.phone}
            </div>
          </div>

          {/* SECTION 2: PAYMENT SUBSYSTEM SPECIFIC DETAILS */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Payment Gateway Verification Record
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Payment Provider</span>
                <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                  {payment?.provider || "Razorpay"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Payment Status</span>
                <Badge
                  variant={
                    order.paymentStatus === "paid"
                      ? "success"
                      : order.paymentStatus === "failed"
                      ? "danger"
                      : "neutral"
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Gateway Order ID</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px] truncate block">
                  {payment?.providerOrderId || "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Gateway Payment ID</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px] truncate block">
                  {payment?.providerPaymentId || "N/A"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Paid Time</span>
                <span className="text-neutral-700 dark:text-neutral-300 text-[11px] block">
                  {payment?.paidAt ? new Date(payment.paidAt).toLocaleString("en-IN") : "Pending"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-400 block text-[11px]">Refund Status</span>
                <span className="font-semibold text-neutral-900 dark:text-white capitalize text-[11px]">
                  {payment?.refundStatus || "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status Operations & CJ Fulfillment (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 3: FULFILLMENT & CJ DROPSHIPPING DETAILS */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-gold" />
              Fulfillment &amp; CJ Dropshipping
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-500">CJ Order ID:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  {order.id}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-500">Fulfillment Status:</span>
                <Badge variant="outline">{order.fulfillmentStatus}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                <span className="text-neutral-500">Shipping Carrier:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">CJ Express Air</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-850">
                  <span className="text-neutral-500">Tracking Number:</span>
                  <span className="font-mono font-bold text-brand-gold">{order.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Operations Form */}
          <form onSubmit={handleSave} className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Update Order Statuses
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="manual_review">Manual Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Fulfillment Status
              </label>
              <select
                value={fulfillmentStatus}
                onChange={(e) => setFulfillmentStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              >
                <option value="unfulfilled">Unfulfilled</option>
                <option value="pending_sync">Pending Sync</option>
                <option value="submitted_to_cj">Submitted to CJ</option>
                <option value="awaiting_cj_payment">Awaiting CJ Payment</option>
                <option value="cj_processing">CJ Processing</option>
                <option value="shipped">Shipped</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="manual_review">Manual Review</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. CJTRK987654321"
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Tracking URL
              </label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://www.17track.net/en/track?nums=..."
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Internal Notes (Invisible to Customer)
              </label>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal verification logs, carrier notices, etc."
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-300 dark:border-neutral-700 text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saving}
              className="w-full text-xs font-semibold"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Update Order Record
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
