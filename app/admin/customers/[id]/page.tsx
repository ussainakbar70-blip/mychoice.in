"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, User, Package, Mail, Phone, Calendar } from "lucide-react";
import { adminGetCustomers, getCustomerAddresses, CustomerAddress } from "@/lib/customers";
import { getCustomerOrders, DetailedOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [customer, setCustomer] = useState<any | null>(null);
  const [orders, setOrders] = useState<DetailedOrder[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      const all = await adminGetCustomers();
      const match = all.find((c) => c.id === customerId);
      if (match) {
        setCustomer(match);
        const [ord, addrs] = await Promise.all([
          getCustomerOrders({ customerId: match.id, email: match.email }),
          getCustomerAddresses(match.id),
        ]);
        setOrders(ord);
        setAddresses(addrs);
      }
      setLoading(false);
    }

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-neutral-400">Loading customer file...</div>;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold">Customer record not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/customers">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Client: {customer.fullName || customer.email}
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Enrolled: {new Date(customer.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Contact Email</span>
          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
            {customer.email}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Orders Placed</span>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">
            {orders.length}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400">Verified Spend</span>
          <p className="text-sm font-bold text-brand-gold">
            {formatMoney(customer.totalSpent, "USD")}
          </p>
        </div>
      </div>

      {/* Orders Placed */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          Order Purchases ({orders.length})
        </h2>

        {orders.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {orders.map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-brand-gold">{o.orderNumber}</span>
                  <span className="text-neutral-400 text-[11px] block">
                    {new Date(o.createdAt).toLocaleDateString()} • {o.items.length} items
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={o.paymentStatus === "paid" ? "success" : "neutral"} size="sm">
                    {o.paymentStatus}
                  </Badge>
                  <strong className="text-neutral-900 dark:text-white">
                    {formatMoney(o.totalAmount, "USD")}
                  </strong>
                  <Link
                    href={`/admin/orders/${o.orderNumber}`}
                    className="text-brand-gold hover:underline font-semibold"
                  >
                    View &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-4 text-center">No orders placed by this customer.</p>
        )}
      </div>

      {/* Saved Addresses */}
      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          Registered Delivery Addresses ({addresses.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {addresses.map((a) => (
            <div key={a.id} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850 leading-relaxed">
              <strong className="text-neutral-900 dark:text-white block font-medium">
                {a.fullName}
              </strong>
              {a.addressLine1}
              {a.addressLine2 && `, ${a.addressLine2}`}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              {a.country} • {a.phone}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
