import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, DEMO_PRODUCTS, DEMO_COUPONS, SeedProduct, SeedCategory } from "./seed-data";

export interface StoredOrder {
  id: string;
  orderNumber: string;
  email?: string | null;
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
    | "failed"
    | "manual_review";
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
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCJOrderSync {
  id: string;
  orderId: string;
  cjOrderId?: string | null;
  syncStatus: string;
  errorMessage?: string | null;
  retryCount: number;
  lastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCJFulfillmentAttempt {
  id: string;
  orderId: string;
  attemptType: string;
  idempotencyKey: string;
  cjOrderId?: string | null;
  cjOrderNumber?: string | null;
  status: string;
  payload?: any;
  response?: any;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPayment {
  id: string;
  orderId: string;
  provider: string;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  providerSignature?: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  email?: string | null;
  contact?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  refundStatus: string;
  refundAmount: number;
  paidAt?: string | null;
  capturedAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredRefund {
  id: string;
  paymentId: string;
  orderId: string;
  provider: string;
  providerRefundId?: string | null;
  amount: number;
  currency: string;
  status: string;
  reason?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string | null;
}

export interface StoredWebhookEvent {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  signature?: string | null;
  payloadHash?: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processingError?: string | null;
  receivedAt: string;
  processedAt?: string | null;
}

export interface StoredNotificationEvent {
  id: string;
  orderId: string;
  notificationType: string;
  eventReference: string;
  recipient: string;
  sentAt: string;
  status: string;
}

// In-memory data store for local dev / testing
class LocalStore {
  private categories: SeedCategory[] = [...CATEGORIES];
  private products: SeedProduct[] = [...DEMO_PRODUCTS];
  private orders: Map<string, StoredOrder> = new Map();
  private payments: Map<string, StoredPayment> = new Map();
  private refunds: Map<string, StoredRefund> = new Map();
  private webhookEvents: Map<string, StoredWebhookEvent> = new Map();
  private notificationEvents: Map<string, StoredNotificationEvent> = new Map();
  private cjOrderSyncs: Map<string, StoredCJOrderSync> = new Map();
  private cjFulfillmentAttempts: Map<string, StoredCJFulfillmentAttempt> = new Map();
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

  createOrder(data: Omit<StoredOrder, "id" | "orderNumber" | "createdAt" | "updatedAt"> & { id?: string; orderNumber?: string }): StoredOrder {
    const year = new Date().getFullYear();
    const orderNumber = data.orderNumber || `ORD-${year}-${this.orderSequence++}`;
    const id = data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

  getOrder(idOrNumber: string): StoredOrder | undefined {
    return this.orders.get(idOrNumber);
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

  // --- Payment Storage ---
  createPayment(data: Omit<StoredPayment, "id" | "createdAt" | "updatedAt">): StoredPayment {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const payment: StoredPayment = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.payments.set(id, payment);
    return payment;
  }

  getPayment(id: string): StoredPayment | undefined {
    return this.payments.get(id);
  }

  getPaymentByOrderId(orderId: string): StoredPayment | undefined {
    for (const p of this.payments.values()) {
      if (p.orderId === orderId) return p;
    }
    return undefined;
  }

  getPaymentByProviderOrderId(providerOrderId: string): StoredPayment | undefined {
    for (const p of this.payments.values()) {
      if (p.providerOrderId === providerOrderId) return p;
    }
    return undefined;
  }

  getPaymentByProviderPaymentId(providerPaymentId: string): StoredPayment | undefined {
    for (const p of this.payments.values()) {
      if (p.providerPaymentId === providerPaymentId) return p;
    }
    return undefined;
  }

  updatePayment(id: string, updates: Partial<StoredPayment>): StoredPayment | null {
    const existing = this.payments.get(id);
    if (!existing) return null;

    const updated: StoredPayment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.payments.set(id, updated);
    return updated;
  }

  getAllPayments(): StoredPayment[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Refund Storage ---
  createRefund(data: Omit<StoredRefund, "id" | "createdAt">): StoredRefund {
    const id = `rfnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const refund: StoredRefund = {
      ...data,
      id,
      createdAt: now,
    };

    this.refunds.set(id, refund);
    return refund;
  }

  getRefundsByPaymentId(paymentId: string): StoredRefund[] {
    return Array.from(this.refunds.values())
      .filter((r) => r.paymentId === paymentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getRefundsByOrderId(orderId: string): StoredRefund[] {
    return Array.from(this.refunds.values())
      .filter((r) => r.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllRefunds(): StoredRefund[] {
    return Array.from(this.refunds.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Webhook Events Ledger ---
  recordWebhookEvent(data: Omit<StoredWebhookEvent, "id" | "receivedAt">): StoredWebhookEvent {
    const key = `${data.provider}:${data.eventId}`;
    const existing = this.webhookEvents.get(key);
    if (existing) return existing;

    const id = `whev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: StoredWebhookEvent = {
      ...data,
      id,
      receivedAt: new Date().toISOString(),
    };

    this.webhookEvents.set(key, event);
    return event;
  }

  getWebhookEvent(provider: string, eventId: string): StoredWebhookEvent | undefined {
    return this.webhookEvents.get(`${provider}:${eventId}`);
  }

  updateWebhookEvent(provider: string, eventId: string, updates: Partial<StoredWebhookEvent>): StoredWebhookEvent | null {
    const key = `${provider}:${eventId}`;
    const existing = this.webhookEvents.get(key);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.webhookEvents.set(key, updated);
    return updated;
  }

  getAllWebhookEvents(): StoredWebhookEvent[] {
    return Array.from(this.webhookEvents.values()).sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  // --- Notification Events Ledger ---
  recordNotificationEvent(data: Omit<StoredNotificationEvent, "id" | "sentAt">): StoredNotificationEvent {
    const key = `${data.orderId}:${data.notificationType}:${data.eventReference}`;
    const existing = this.notificationEvents.get(key);
    if (existing) return existing;

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const event: StoredNotificationEvent = {
      ...data,
      id,
      sentAt: new Date().toISOString(),
    };

    this.notificationEvents.set(key, event);
    return event;
  }

  hasNotificationEvent(orderId: string, notificationType: string, eventReference: string): boolean {
    const key = `${orderId}:${notificationType}:${eventReference}`;
    return this.notificationEvents.has(key);
  }

  // --- CJ Order Sync Storage ---
  upsertCJOrderSync(data: {
    orderId: string;
    cjOrderId?: string | null;
    syncStatus: string;
    errorMessage?: string | null;
    retryCount?: number;
  }): StoredCJOrderSync {
    const existing = this.cjOrderSyncs.get(data.orderId);
    const now = new Date().toISOString();
    if (existing) {
      const updated: StoredCJOrderSync = {
        ...existing,
        cjOrderId: data.cjOrderId !== undefined ? data.cjOrderId : existing.cjOrderId,
        syncStatus: data.syncStatus,
        errorMessage: data.errorMessage !== undefined ? data.errorMessage : existing.errorMessage,
        retryCount: data.retryCount !== undefined ? data.retryCount : existing.retryCount + 1,
        lastAttemptAt: now,
        updatedAt: now,
      };
      this.cjOrderSyncs.set(data.orderId, updated);
      return updated;
    }

    const id = `cjsync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sync: StoredCJOrderSync = {
      id,
      orderId: data.orderId,
      cjOrderId: data.cjOrderId || null,
      syncStatus: data.syncStatus,
      errorMessage: data.errorMessage || null,
      retryCount: data.retryCount || 0,
      lastAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.cjOrderSyncs.set(data.orderId, sync);
    return sync;
  }

  getCJOrderSync(orderId: string): StoredCJOrderSync | undefined {
    return this.cjOrderSyncs.get(orderId);
  }

  getAllCJOrderSync(): StoredCJOrderSync[] {
    return Array.from(this.cjOrderSyncs.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // --- CJ Fulfillment Attempts Storage ---
  recordCJFulfillmentAttempt(data: {
    orderId: string;
    attemptType?: string;
    idempotencyKey: string;
    cjOrderId?: string | null;
    cjOrderNumber?: string | null;
    status: string;
    payload?: any;
    response?: any;
    errorMessage?: string | null;
  }): StoredCJFulfillmentAttempt {
    const existing = this.cjFulfillmentAttempts.get(data.idempotencyKey);
    const now = new Date().toISOString();
    if (existing) {
      const updated: StoredCJFulfillmentAttempt = {
        ...existing,
        ...data,
        updatedAt: now,
      };
      this.cjFulfillmentAttempts.set(data.idempotencyKey, updated);
      return updated;
    }

    const id = `cjatt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const attempt: StoredCJFulfillmentAttempt = {
      id,
      orderId: data.orderId,
      attemptType: data.attemptType || "create_order",
      idempotencyKey: data.idempotencyKey,
      cjOrderId: data.cjOrderId || null,
      cjOrderNumber: data.cjOrderNumber || null,
      status: data.status,
      payload: data.payload,
      response: data.response,
      errorMessage: data.errorMessage || null,
      createdAt: now,
      updatedAt: now,
    };
    this.cjFulfillmentAttempts.set(data.idempotencyKey, attempt);
    return attempt;
  }

  getCJFulfillmentAttempt(idempotencyKey: string): StoredCJFulfillmentAttempt | undefined {
    return this.cjFulfillmentAttempts.get(idempotencyKey);
  }

  getCJFulfillmentAttemptsByOrderId(orderId: string): StoredCJFulfillmentAttempt[] {
    return Array.from(this.cjFulfillmentAttempts.values())
      .filter((a) => a.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateCJFulfillmentAttempt(idempotencyKey: string, updates: Partial<StoredCJFulfillmentAttempt>): StoredCJFulfillmentAttempt | null {
    const existing = this.cjFulfillmentAttempts.get(idempotencyKey);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.cjFulfillmentAttempts.set(idempotencyKey, updated);
    return updated;
  }
}

export const dbStore = new LocalStore();

import { Database } from "./database.types";

export function isSupabaseConfigured(): boolean {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      key &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

export function getSupabaseBrowserClient(): ReturnType<typeof createClient<Database>> & any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";
  return createClient(url, key) as any;
}

export function getSupabaseServerClient(): ReturnType<typeof createClient<Database>> & any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any;
}
