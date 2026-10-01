"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  Boxes,
  Ticket,
  MessageSquare,
  Settings,
  ShieldCheck,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUser, UserProfile } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAdmin() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setLoading(false);
    }
    verifyAdmin();
  }, []);

  const navLinks = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Categories Engine", href: "/admin/categories", icon: FolderTree },
    { label: "Orders & Fulfillment", href: "/admin/orders", icon: ShoppingCart },
    { label: "Payments & Ledger", href: "/admin/payments", icon: CreditCard },
    { label: "Customers Directory", href: "/admin/customers", icon: Users },
    { label: "Inventory & Alerts", href: "/admin/inventory", icon: Boxes },
    { label: "CJ Dropshipping", href: "/admin/cj", icon: Truck },
    { label: "Coupons & Discounts", href: "/admin/coupons", icon: Ticket },
    { label: "Reviews Moderation", href: "/admin/reviews", icon: MessageSquare },
    { label: "Audit Logs", href: "/admin/audit", icon: FileText },
    { label: "Store Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Admin Top Navbar */}
      <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Logo />
          <Badge variant="gold" size="sm">Admin Console</Badge>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Storefront View</span>
          </Link>
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800" />
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            {currentUser?.fullName || currentUser?.email || "Admin Operator"}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-white dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-1 shrink-0">
          <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-neutral-400">
            Management Modules
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Main Admin Content Body */}
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
