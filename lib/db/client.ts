import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, DEMO_PRODUCTS, DEMO_COUPONS, SeedProduct, SeedCategory } from "./seed-data";

export interface StoredOrder {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
  fulfillmentStatus:
    | "unfulfilled"
    | "pending_sync"
    | "submitted_to_cj"
    | "awaiting_cj_payment"
    | "cj_processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "failed";
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    countryCode: string;
  };
  items: {
    productId: string;
    variantId: string;
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    cjProductId?: string;
    cjVariantId?: string;
  }[];
  cjOrderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory data store for local dev / testing
class LocalStore {
  private categories: SeedCategory[] = [...CATEGORIES];
  private products: SeedProduct[] = [...DEMO_PRODUCTS];
  private orders: Map<string, StoredOrder> = new Map();
  private orderSequence = 10001;

  getCategories(): SeedCategory[] {
    return this.categories.filter((c) => c.isActive);
  }

  getCategoryBySlug(slug: string): SeedCategory | undefined {
    return this.categories.find((c) => c.slug === slug);
  }

  getProducts(filters?: {
    categoryId?: string;
    categorySlug?: string;
    featured?: boolean;
    bestseller?: boolean;
    newArrival?: boolean;
    search?: string;
    status?: string;
  }): SeedProduct[] {
    let result = this.products;

    if (filters?.status) {
      result = result.filter((p) => p.status === filters.status);
    } else {
      result = result.filter((p) => p.status === "published");
    }

    if (filters?.categorySlug) {
      const cat = this.getCategoryBySlug(filters.categorySlug);
      if (cat) {
        result = result.filter((p) => p.categoryId === cat.id);
      } else {
        return [];
      }
    }

    if (filters?.categoryId) {
      result = result.filter((p) => p.categoryId === filters.categoryId);
    }

    if (filters?.featured !== undefined) {
      result = result.filter((p) => p.featured === filters.featured);
    }

    if (filters?.bestseller !== undefined) {
      result = result.filter((p) => p.bestseller === filters.bestseller);
    }

    if (filters?.newArrival !== undefined) {
      result = result.filter((p) => p.newArrival === filters.newArrival);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.shortDescription.toLowerCase().includes(query) ||
          p.brandName.toLowerCase().includes(query) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(query))
      );
    }

    return result;
  }

  getProductBySlug(slug: string): SeedProduct | undefined {
    return this.products.find((p) => p.slug === slug);
  }

  getProductById(id: string): SeedProduct | undefined {
    return this.products.find((p) => p.id === id);
  }

  updateProduct(id: string, updates: Partial<SeedProduct>): SeedProduct | null {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.products[index] = { ...this.products[index], ...updates };
    return this.products[index];
  }

  addProduct(product: SeedProduct): SeedProduct {
    this.products.unshift(product);
    return product;
  }

  createOrder(data: Omit<StoredOrder, "id" | "orderNumber" | "createdAt" | "updatedAt">): StoredOrder {
    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${this.orderSequence++}`;
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const order: StoredOrder = {
      ...data,
      id,
      orderNumber,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(orderNumber, order);
    this.orders.set(id, order);
    return order;
  }

  getOrderByNumber(orderNumber: string): StoredOrder | undefined {
    return this.orders.get(orderNumber);
  }

  getOrderById(id: string): StoredOrder | undefined {
    return this.orders.get(id);
  }

  getAllOrders(): StoredOrder[] {
    // Unique list of orders (since map stores by both ID and orderNumber)
    const uniqueOrders = new Map<string, StoredOrder>();
    for (const order of this.orders.values()) {
      uniqueOrders.set(order.id, order);
    }
    return Array.from(uniqueOrders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateOrder(orderIdOrNumber: string, updates: Partial<StoredOrder>): StoredOrder | null {
    const existing = this.orders.get(orderIdOrNumber);
    if (!existing) return null;

    const updated: StoredOrder = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(existing.id, updated);
    this.orders.set(existing.orderNumber, updated);
    return updated;
  }
}

export const dbStore = new LocalStore();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createClient(url, key);
}
