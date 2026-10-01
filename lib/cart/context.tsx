"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { SupportedCurrency, SITE_CONFIG } from "@/lib/config/site";
import { formatMoney } from "@/lib/currency";
import { validateAndRefreshCart, mergeGuestCart, saveAuthenticatedCart, getAuthenticatedCart } from "./service";
import { getCurrentUser, UserProfile } from "@/lib/auth";

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
  cartNotifications: string[];
  dismissNotification: (index: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrencyState] = useState<SupportedCurrency>("USD");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cartNotifications, setCartNotifications] = useState<string[]>([]);

  // Load initial cart and check user
  useEffect(() => {
    async function initCart() {
      let initialItems: CartItem[] = [];
      try {
        const savedCart = localStorage.getItem("mychoice_cart");
        if (savedCart) {
          initialItems = JSON.parse(savedCart);
        }
        const savedCurrency = localStorage.getItem("mychoice_currency") as SupportedCurrency;
        if (savedCurrency && SITE_CONFIG.currencies.supported.includes(savedCurrency)) {
          setCurrencyState(savedCurrency);
        }
      } catch {
        // Ignore storage errors
      }

      // Check current user session
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user) {
        if (initialItems.length > 0) {
          // Merge guest cart into account
          const merged = await mergeGuestCart(user.id, initialItems);
          setItems(merged);
        } else {
          const authItems = await getAuthenticatedCart(user.id);
          setItems(authItems);
        }
      } else {
        // Refresh guest items against catalog
        if (initialItems.length > 0) {
          const check = await validateAndRefreshCart(initialItems);
          if (check.messages.length > 0) {
            setCartNotifications(check.messages);
          }
          setItems(check.items);
        }
      }

      setIsLoaded(true);
    }

    initCart();

    // Listen to auth changes
    const handleAuthChange = async (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile | null>;
      const user = customEvent.detail;
      setCurrentUser(user);

      if (user) {
        const currentLocal = (() => {
          try {
            const raw = localStorage.getItem("mychoice_cart");
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        })();

        const merged = await mergeGuestCart(user.id, currentLocal);
        setItems(merged);
      }
    };

    window.addEventListener("auth_state_change", handleAuthChange);
    return () => window.removeEventListener("auth_state_change", handleAuthChange);
  }, []);

  // Save cart changes
  useEffect(() => {
    if (!isLoaded) return;

    if (currentUser) {
      saveAuthenticatedCart(currentUser.id, items);
    } else {
      try {
        localStorage.setItem("mychoice_cart", JSON.stringify(items));
      } catch {
        // Ignore storage errors
      }
    }
  }, [items, isLoaded, currentUser]);

  const setCurrency = (c: SupportedCurrency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem("mychoice_currency", c);
    } catch {
      // Ignore
    }
  };

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
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
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (!currentUser) {
      try {
        localStorage.removeItem("mychoice_cart");
      } catch {
        // Ignore
      }
    }
  }, [currentUser]);

  const dismissNotification = (index: number) => {
    setCartNotifications((prev) => prev.filter((_, i) => i !== index));
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
        cartNotifications,
        dismissNotification,
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
