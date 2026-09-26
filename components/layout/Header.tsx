"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Menu, Heart, ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { CurrencySelector } from "./CurrencySelector";
import { SearchModal } from "@/components/search/SearchModal";
import { MobileMenu } from "./MobileMenu";
import { useCart } from "@/lib/cart/context";
import { CATEGORIES } from "@/lib/db/seed-data";

export function Header() {
  const { itemCount, openCartDrawer } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesHovered, setIsCategoriesHovered] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Mobile Menu Trigger & Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Logo showTagline={false} />
            </div>

            {/* Center: Desktop Navigation Bar */}
            <nav className="hidden lg:flex items-center gap-7">
              <Link
                href="/shop"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Shop All
              </Link>

              {/* Categories Mega Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setIsCategoriesHovered(true)}
                onMouseLeave={() => setIsCategoriesHovered(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors py-2">
                  <span>Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isCategoriesHovered ? "rotate-180" : ""}`} />
                </button>

                {isCategoriesHovered && (
                  <div className="absolute top-full -left-20 w-[540px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 z-50 animate-slide-up grid grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        onClick={() => setIsCategoriesHovered(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700">
                          <img
                            src={cat.imageUrl}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate group-hover:text-brand-gold transition-colors">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {cat.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/shop?sort=newest"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                href="/shop?sort=bestseller"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Best Sellers
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                href="/track-order"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Track Order
              </Link>
            </nav>

            {/* Right: Actions (Search, Currency, Wishlist, Bag) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <CurrencySelector className="hidden sm:block" />

              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Search store"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                href="/account"
                className="p-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors hidden sm:inline-flex"
                aria-label="Account"
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* Cart Drawer Button */}
              <button
                onClick={openCartDrawer}
                className="relative p-2 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-900 text-white dark:bg-brand-gold dark:text-neutral-950 text-[10px] font-bold shadow-sm">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Instant Search Overlay */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
