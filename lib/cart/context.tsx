"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SupportedCurrency, SITE_CONFIG } from "@/lib/config/site";
import { formatMoney } from "@/lib/currency";

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  variantName?: string;
  price: number; // Base USD price
  image: string;
  sku: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  formattedSubtotal: string;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState<SupportedCurrency>("USD");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart and currency from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("mychoice_cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      const savedCurrency = localStorage.getItem("mychoice_currency") as SupportedCurrency;
      if (savedCurrency && SITE_CONFIG.currencies.supported.includes(savedCurrency)) {
        setCurrencyState(savedCurrency);
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("mychoice_cart", JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items, isLoaded]);

  const setCurrency = (c: SupportedCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("mychoice_currency", c);
    } catch {
      // Ignore
    }
  };

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const formattedSubtotal = formatMoney(subtotal, currency);

  return (
    <CartContext.Provider
      value={{
        items,
        currency,
        setCurrency,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
        formattedSubtotal,
        isCartDrawerOpen,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
