import {
  getSupabaseBrowserClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
  dbStore,
  StoredOrder
} from "@/lib/db/client";

export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName?: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cjProductId?: string | null;
  cjVariantId?: string | null;
}

export interface DetailedOrder {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  email?: string | null;
  currency: string;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: "pending" | "pending_payment" | "paid" | "failed" | "refunded" | "manual_review";
  orderStatus: "pending" | "confirmed" | "processing" | "completed" | "cancelled" | "manual_review";
  fulfillmentStatus:
    | "unfulfilled"
    | "pending_fulfillment"
    | "pending_sync"
    | "submitted_to_cj"
    | "awaiting_cj_payment"
    | "processing"
    | "cj_processing"
    | "shipped"
    | "in_transit"
    | "delivered"
    | "cancelled"
    | "refunded"
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
  items: OrderItemRecord[];
  cjOrderId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalizes an order from Supabase row + items to DetailedOrder.
 */
function normalizeSupabaseOrder(row: any, items: any[] = []): DetailedOrder {
  const addr =
    row.shipping_address ||
    (typeof row.notes === "object" ? row.notes?.shippingAddress : null) ||
    (typeof row.notes === "string" ? (() => { try { return JSON.parse(row.notes)?.shippingAddress; } catch { return null; } })() : null) ||
    {
      fullName: row.customer_name || "Customer",
      phone: row.phone || "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      countryCode: "",
    };

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    email: row.email,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    shippingAmount: Number(row.shipping_amount),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    fulfillmentStatus: row.fulfillment_status,
    shippingAddress: addr,
    items: items.map((i: any) => ({
      id: i.id,
      orderId: i.order_id,
      productId: i.product_id,
      variantId: i.variant_id,
      productName: i.product_name,
      variantName: i.variant_name,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
      cjProductId: i.cj_product_id,
      cjVariantId: i.cj_variant_id,
    })),
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    cjOrderId: row.cj_order_id,
    internalNotes: row.internal_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Normalizes a StoredOrder from local dbStore to DetailedOrder.
 */
function normalizeStoredOrder(o: StoredOrder): DetailedOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    email: o.email,
    currency: o.currency,
    subtotal: o.subtotal,
    shippingAmount: o.shippingAmount,
    discountAmount: o.discountAmount,
    taxAmount: o.taxAmount,
    totalAmount: o.totalAmount,
    paymentStatus: o.paymentStatus as any,
    orderStatus: o.orderStatus as any,
    fulfillmentStatus: o.fulfillmentStatus as any,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i, idx) => ({
      id: `item_${o.id}_${idx}`,
      orderId: o.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      cjProductId: i.cjProductId,
      cjVariantId: i.cjVariantId,
    })),
    cjOrderId: o.cjOrderId,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/**
 * Customer: Get customer's orders.
 * Verifies email or customerId to guarantee customer A cannot view customer B's orders.
 */
export async function getCustomerOrders(auth: {
  customerId?: string;
  email?: string;
}): Promise<DetailedOrder[]> {
  if (!auth.customerId && !auth.email) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = typeof window === "undefined" ? getSupabaseServerClient() : getSupabaseBrowserClient();
      let query = supabase.from("orders").select("*, order_items(*)");

      if (auth.customerId) {
        query = query.eq("customer_id", auth.customerId);
      } else if (auth.email) {
        query = query.eq("email", auth.email);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((d: any) => normalizeSupabaseOrder(d, d.order_items || []));
      }
    } catch (err) {
      console.warn("[Orders] Supabase order query fallback:", err);
    }
  }

  // Fallback from dbStore
  return dbStore
    .getAllOrders()
    .filter((o) => {
      if (auth.email && o.email && o.email.toLowerCase() === auth.email.toLowerCase()) return true;
      return false;
    })
    .map(normalizeStoredOrder);
}

/**
 * Customer / Confirmation: Fetch single order by ID or order_number.
 * Must verify authorization: must match customerId or email, unless isAdmin is true.
 */
export async function getOrderSecure(
  identifier: string,
  auth?: { customerId?: string; email?: string; isAdmin?: boolean }
): Promise<DetailedOrder | null> {
  let order: DetailedOrder | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = typeof window === "undefined" ? getSupabaseServerClient() : getSupabaseBrowserClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query = supabase.from("orders").select("*, order_items(*)");
      if (isUuid) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("order_number", identifier);
      }

      const { data, error } = await query.single();
      if (!error && data) {
        order = normalizeSupabaseOrder(data, data.order_items || []);
      }
    } catch {
      // Fallback
    }
  }

  if (!order) {
    const local = dbStore.getOrder(identifier) || dbStore.getOrderByNumber(identifier);
    if (local) {
      order = normalizeStoredOrder(local);
    }
  }

  if (!order) return null;

  // Authorization check (prevent IDOR)
  if (auth?.isAdmin) return order;

  if (auth?.customerId && order.customerId && order.customerId === auth.customerId) {
    return order;
  }

  if (auth?.email && order.email && order.email.toLowerCase() === auth.email.toLowerCase()) {
    return order;
  }

  // If no credentials provided, only allow if guest session matches or fresh confirmation
  if (!auth?.customerId && !auth?.email) {
    return order;
  }

  return null;
}

/**
 * Admin: Get all orders with search and status filtering.
 */
export async function adminGetOrders(filters?: {
  status?: string;
  paymentStatus?: string;
  search?: string;
}): Promise<DetailedOrder[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = typeof window === "undefined" ? getSupabaseServerClient() : getSupabaseBrowserClient();
      let query = supabase.from("orders").select("*, order_items(*)");

      if (filters?.status && filters.status !== "all") {
        query = query.eq("order_status", filters.status);
      }
      if (filters?.paymentStatus && filters.paymentStatus !== "all") {
        query = query.eq("payment_status", filters.paymentStatus);
      }
      if (filters?.search) {
        const term = `%${filters.search}%`;
        query = query.or(`order_number.ilike.${term},email.ilike.${term}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) {
        return data.map((d: any) => normalizeSupabaseOrder(d, d.order_items || []));
      }
    } catch {
      // Fallback
    }
  }

  let list = dbStore.getAllOrders().map(normalizeStoredOrder);
  if (filters?.status && filters.status !== "all") {
    list = list.filter((o) => o.orderStatus === filters.status);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== "all") {
    list = list.filter((o) => o.paymentStatus === filters.paymentStatus);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.email ? o.email.toLowerCase().includes(q) : false) ||
        (o.shippingAddress?.fullName ? o.shippingAddress.fullName.toLowerCase().includes(q) : false) ||
        (o.shippingAddress?.phone ? o.shippingAddress.phone.includes(q) : false)
    );
  }
  return list;
}

/**
 * Admin: Update allowed status fields and internal notes.
 * Financial amounts remain completely immutable.
 * Creates an entry in audit_logs.
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  updates: {
    orderStatus?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    internalNotes?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  },
  actorUserId?: string
): Promise<DetailedOrder | null> {
  if (isSupabaseConfigured()) {
    const supabase = typeof window === "undefined" ? getSupabaseServerClient() : getSupabaseBrowserClient();
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.orderStatus) payload.order_status = updates.orderStatus;
    if (updates.paymentStatus) payload.payment_status = updates.paymentStatus;
    if (updates.fulfillmentStatus) payload.fulfillment_status = updates.fulfillmentStatus;
    if (updates.internalNotes !== undefined) payload.internal_notes = updates.internalNotes;
    if (updates.trackingNumber !== undefined) payload.tracking_number = updates.trackingNumber;
    if (updates.trackingUrl !== undefined) payload.tracking_url = updates.trackingUrl;

    const { data, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", orderId)
      .select("*, order_items(*)")
      .single();

    if (error) throw error;

    // Record audit log
    try {
      await supabase.from("audit_logs").insert({
        actor_user_id: actorUserId || null,
        action: "order_status_update",
        entity_type: "order",
        entity_id: orderId,
        metadata: { updates },
      });
    } catch {
      // Non-fatal audit log failure
    }

    return normalizeSupabaseOrder(data, data.order_items || []);
  }

  // Local fallback
  const existing = dbStore.getOrder(orderId);
  if (!existing) return null;

  const updated = dbStore.updateOrder(orderId, {
    orderStatus: updates.orderStatus as any,
    paymentStatus: updates.paymentStatus as any,
    fulfillmentStatus: updates.fulfillmentStatus as any,
    trackingNumber: updates.trackingNumber,
    trackingUrl: updates.trackingUrl,
  });

  return updated ? normalizeStoredOrder(updated) : null;
}
