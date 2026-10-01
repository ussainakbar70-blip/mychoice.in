"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, RefreshCw, Mail, Phone, Calendar, ArrowRight } from "lucide-react";
import { adminGetCustomers } from "@/lib/customers";
import { formatMoney } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await adminGetCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.fullName && c.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Customer Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Audit registered customer profiles, lifetime checkouts, and total customer spend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCustomers} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh List
        </Button>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by customer name or email..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400">Loading customer profiles...</div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold uppercase">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Orders Placed</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4">Enrolled Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50">
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                      {c.fullName || "Unspecified"}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      {c.email}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {c.phone || "—"}
                    </td>
                    <td className="py-3 px-4 font-bold text-neutral-800 dark:text-neutral-200">
                      {c.orderCount}
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-gold">
                      {formatMoney(c.totalSpent, "USD")}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-brand-gold hover:underline font-semibold"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-neutral-400">
            No customers matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
