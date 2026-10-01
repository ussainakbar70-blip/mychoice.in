"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatUSD } from "@/lib/payments/money";

interface PaymentItem {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  refundStatus: string;
  refundAmount: number;
  paidAt?: string;
  createdAt: string;
  orderStatus?: string;
  fulfillmentStatus?: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Refund Modal State
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (activeSearch) q.set("search", activeSearch);
      if (statusFilter !== "all") q.set("status", statusFilter);

      const res = await fetch(`/api/admin/payments?${q.toString()}`);
      const data = await res.json();
      if (data.success && data.payments) {
        setPayments(data.payments);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load payment transactions." });
    } finally {
      setLoading(false);
    }
  }, [activeSearch, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const handleOpenRefund = (payment: PaymentItem) => {
    setSelectedPayment(payment);
    const maxRefundable = Math.max(0, payment.amount - payment.refundAmount);
    setRefundAmount(maxRefundable.toString());
    setRefundReason("Customer requested refund");
    setRefundModalOpen(true);
    setStatusMsg(null);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;

    setRefundSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ type: "error", text: data.error || "Refund processing failed." });
        setRefundSubmitting(false);
        return;
      }

      setStatusMsg({
        type: "success",
        text: `Refund of $${data.refund.amount} completed successfully (${data.refundStatus} refund).`,
      });
      setRefundModalOpen(false);
      fetchPayments();
    } catch {
      setStatusMsg({ type: "error", text: "Network error processing refund." });
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleReconcile = async (paymentId: string) => {
    setReconcilingId(paymentId);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/reconcile`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.reconciliation) {
        setStatusMsg({
          type: "success",
          text: data.reconciliation.message,
        });
        fetchPayments();
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Reconciliation failed.",
        });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Error connecting to reconciliation engine." });
    } finally {
      setReconcilingId(null);
    }
  };

  // Metrics
  const totalCollected = payments
    .filter((p) => p.status === "captured" || p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = payments.reduce((sum, p) => sum + (p.refundAmount || 0), 0);
  const capturedCount = payments.filter((p) => p.status === "captured" || p.status === "succeeded").length;

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-brand-gold" />
            Payment Gateway &amp; Ledger
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Authoritative Razorpay gateway integration, automated webhooks, partial/full refunds &amp; reconciliation.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Ledger</span>
        </Button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[11px] uppercase font-bold text-neutral-400">Total Captured Volume</span>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{formatUSD(totalCollected)}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{capturedCount} Captured Transactions</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[11px] uppercase font-bold text-neutral-400">Total Refunded Volume</span>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{formatUSD(totalRefunded)}</p>
          <p className="text-[11px] text-neutral-500 font-semibold">Processed to Customer Source</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-1">
          <span className="text-[11px] uppercase font-bold text-neutral-400">Active Provider</span>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">Cashfree PG</p>
          <p className="text-[11px] text-brand-gold font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            RBI &amp; PCI-DSS Verified
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order number, email, or payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="captured">Captured / Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Provider / ID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Refund Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No payment records match the current filter.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                      <Link href={`/admin/orders/${p.orderId}`} className="hover:underline text-brand-gold">
                        {p.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 truncate max-w-[160px]">{p.email || "Guest"}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                        {p.providerPaymentId || p.providerOrderId || "Pending creation"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatUSD(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          p.status === "captured" || p.status === "succeeded"
                            ? "success"
                            : p.status === "failed"
                            ? "danger"
                            : p.status === "refunded"
                            ? "outline"
                            : "neutral"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.refundStatus && p.refundStatus !== "none" ? (
                        <Badge variant={p.refundStatus === "full" ? "danger" : "warning"}>
                          {p.refundStatus === "full" ? "Full Refund" : `$${p.refundAmount} Refunded`}
                        </Badge>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayment(p);
                          setDetailModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        title="View Payment Detail"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {(p.status === "captured" || p.status === "partially_refunded") && (
                        <button
                          onClick={() => handleOpenRefund(p)}
                          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                          title="Issue Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleReconcile(p.id)}
                        disabled={reconcilingId === p.id}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                        title="Reconcile with Gateway"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reconcilingId === p.id ? "animate-spin text-brand-gold" : ""}`} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {refundModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                Issue Refund for {selectedPayment.orderNumber}
              </h3>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRefund} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 space-y-1">
                <div className="flex justify-between text-neutral-500">
                  <span>Captured Total:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{formatUSD(selectedPayment.amount)}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>Prior Refunds:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{formatUSD(selectedPayment.refundAmount)}</span>
                </div>
                <div className="flex justify-between text-neutral-700 dark:text-neutral-300 font-bold border-t border-neutral-200 dark:border-neutral-700 pt-1">
                  <span>Max Refundable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatUSD(selectedPayment.amount - selectedPayment.refundAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Refund Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedPayment.amount - selectedPayment.refundAmount}
                  min={1}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer return / Damaged goods"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setRefundModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={refundSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white">
                  Confirm Refund
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {detailModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                Payment Record: {selectedPayment.orderNumber}
              </h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                <div>
                  <span className="text-neutral-400">Payment ID:</span>
                  <p className="font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Provider:</span>
                  <p className="font-semibold uppercase">{selectedPayment.provider}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Gateway Order ID:</span>
                  <p className="font-mono">{selectedPayment.providerOrderId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Gateway Transaction ID:</span>
                  <p className="font-mono">{selectedPayment.providerPaymentId || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                <div>
                  <span className="text-neutral-400">Amount:</span>
                  <p className="font-bold">{formatUSD(selectedPayment.amount)}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Status:</span>
                  <p className="font-semibold capitalize">{selectedPayment.status}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Method:</span>
                  <p className="capitalize">{selectedPayment.method || "Standard"}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Refund Status:</span>
                  <p className="capitalize">{selectedPayment.refundStatus}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
