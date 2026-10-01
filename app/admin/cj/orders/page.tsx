"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  X,
} from "lucide-react";
import type { FulfillOrderResult } from "@/lib/cj/fulfillment";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/currency";

export interface CJAdminOrder {
  id: string;
  orderNumber: string;
  email: string;
  customerName?: string;
  phone?: string;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus?: string;
  paymentProvider?: string;
  cjOrderId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingAddress?: {
    fullName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
    phone?: string;
  } | null;
  items: Array<{
    sku?: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    totalPrice: number;
    cjVariantId?: string | null;
  }>;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminCJOrdersPage() {
  const [orders, setOrders] = useState<CJAdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<CJAdminOrder | null>(null);
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=100");
      if (!res.ok) {
        throw new Error(`Failed to load orders: ${res.statusText}`);
      }
      const data = await res.json();
      const loaded: CJAdminOrder[] = data.orders || [];
      setOrders(loaded);
      return loaded;
    } catch (err: unknown) {
      console.error("Error loading CJ admin orders:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleFulfillOrder = async (orderId: string) => {
    setFulfillingId(orderId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/cj/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": "admin",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || `Fulfillment failed: ${res.statusText}`);
      }
      setActionMessage(data.message || (data.success ? "Fulfillment submitted to CJ." : "Fulfillment error."));
      const updatedOrders = await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const found = updatedOrders.find((o) => o.id === orderId);
        setSelectedOrder(found || null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fulfillment failed";
      setActionMessage(`Error: ${msg}`);
    } finally {
      setFulfillingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.email && o.email.toLowerCase().includes(search.toLowerCase())) ||
      (o.cjOrderId && o.cjOrderId.toLowerCase().includes(search.toLowerCase())) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(search.toLowerCase()));

    const currentFulfillment = o.fulfillmentStatus || "unfulfilled";
    const matchesStatus =
      statusFilter === "all" ||
      currentFulfillment === statusFilter ||
      (statusFilter === "payment_required" && o.paymentStatus !== "paid");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Link href="/admin/cj" className="hover:text-white transition-colors">
          CJ Integration
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">Order Fulfillment Pipeline</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-tight">CJ Order Dispatch & Fulfillment</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Authoritative order submission, CJ balance payment states, and carrier tracking sync
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadOrders}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-white/20 text-neutral-200 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order number, customer email, CJ Order ID, or tracking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All" },
            { id: "unfulfilled", label: "Pending" },
            { id: "submitted_to_cj", label: "Submitted to CJ" },
            { id: "shipped", label: "Shipped" },
            { id: "delivered", label: "Delivered" },
            { id: "failed", label: "Failed / Review" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                statusFilter === st.id
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "bg-neutral-900 border border-white/10 text-neutral-300 hover:text-white"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-neutral-900/60 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 font-mono border-b border-white/10 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Local Order</th>
                <th className="py-3 px-4">CJ Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4">Tracking</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    Loading order pipeline...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No matching fulfillment orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isSubmitted = Boolean(o.cjOrderId);
                  const isShipped = o.fulfillmentStatus === "shipped";
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="hover:text-amber-400 transition-colors text-left"
                        >
                          {o.orderNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        {o.cjOrderId ? (
                          <span className="text-amber-400 font-semibold">{o.cjOrderId}</span>
                        ) : (
                          <span className="text-neutral-500">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-neutral-300">
                        <div className="line-clamp-1">{o.shippingAddress?.fullName || "Customer"}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">{o.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatMoney(o.totalAmount, o.currency as any)}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.paymentStatus === "paid"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {o.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.fulfillmentStatus === "shipped"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : o.fulfillmentStatus === "delivered"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : o.fulfillmentStatus === "submitted_to_cj"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-neutral-800 text-neutral-400 border border-white/10"
                          }`}
                        >
                          {(o.fulfillmentStatus || "unfulfilled").replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {o.trackingNumber ? (
                          <a
                            href={o.trackingUrl || `https://www.17track.net/en/track?nums=${o.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>{o.trackingNumber}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-neutral-500">Pending Carrier</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                            title="Inspect Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isSubmitted ? (
                            <Button
                              size="sm"
                              onClick={() => handleFulfillOrder(o.id)}
                              disabled={fulfillingId === o.id}
                              className="text-xs py-1 px-2.5 h-7 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold"
                            >
                              {fulfillingId === o.id ? "Submitting..." : "Fulfill via CJ"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFulfillOrder(o.id)}
                              disabled={fulfillingId === o.id}
                              className="text-xs py-1 px-2.5 h-7 border-white/10 text-neutral-400 hover:text-white"
                            >
                              Re-check
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-serif text-white">{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-neutral-400">Created: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CJ Linkage Bar */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-neutral-400 block">CJ Dropshipping Order ID</span>
                <span className="text-amber-400 font-bold text-sm">
                  {selectedOrder.cjOrderId || "Not yet submitted to CJ"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block">Carrier Tracking</span>
                <span className="text-blue-400 font-bold">
                  {selectedOrder.trackingNumber || "Pending Dispatch"}
                </span>
              </div>
            </div>

            {/* Failure Reason / Actionable Notes */}
            {selectedOrder.internalNotes && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fulfillment Note / Block Reason</span>
                </div>
                <p className="text-neutral-300 font-sans">{selectedOrder.internalNotes}</p>
              </div>
            )}

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-mono uppercase text-neutral-400 tracking-wider mb-2">Purchased Items & CJ Mapping</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-neutral-950/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-white">{item.productName}</div>
                      <div className="text-neutral-400 font-mono">
                        SKU: {item.sku} • Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-white font-bold">{formatMoney(item.totalPrice, selectedOrder.currency as any)}</div>
                      <div className="text-[11px] text-amber-400/80">
                        {item.cjVariantId ? `VID: ${item.cjVariantId}` : "Auto-resolved"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h4 className="text-xs font-mono uppercase text-neutral-400 tracking-wider mb-2">Destination Address</h4>
              <div className="p-3 rounded-lg bg-neutral-950/60 border border-white/5 text-xs text-neutral-300 font-mono space-y-1">
                <div className="font-bold text-white">{selectedOrder.shippingAddress?.fullName}</div>
                <div>{selectedOrder.shippingAddress?.addressLine1}</div>
                {selectedOrder.shippingAddress?.addressLine2 && <div>{selectedOrder.shippingAddress.addressLine2}</div>}
                <div>
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}
                </div>
                <div>{selectedOrder.shippingAddress?.country} ({selectedOrder.shippingAddress?.countryCode})</div>
                <div className="text-neutral-400">{selectedOrder.shippingAddress?.phone}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {!selectedOrder.cjOrderId && (
                <Button
                  size="sm"
                  onClick={() => handleFulfillOrder(selectedOrder.id)}
                  disabled={fulfillingId === selectedOrder.id}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold"
                >
                  {fulfillingId === selectedOrder.id ? "Submitting..." : "Fulfill Order via CJ"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
