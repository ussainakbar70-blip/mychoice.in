import crypto from "crypto";
import { CJWebhookPayload, CJWebhookSubscription } from "./types";
import { getSupabaseServerClient, isSupabaseConfigured, dbStore } from "@/lib/db/client";
import { emailService } from "@/lib/email";

/**
 * Verifies CJdropshipping webhook signature according to official API 2.0 specifications.
 * - Secret: The openId returned by Get Access Token API (or CJ_OPEN_ID / CJ_WEBHOOK_SECRET).
 * - Message: The RAW string of the HTTP request body.
 * - Algorithm: HMAC-SHA256 with Base64 encoding.
 * - Comparison: Timing-safe comparison.
 */
export function verifyCJWebhookSignature(
  rawBody: string,
  signatureHeader?: string | null,
  secretKey?: string
): boolean {
  const secret = secretKey || process.env.CJ_OPEN_ID || process.env.CJ_WEBHOOK_SECRET || process.env.CJ_API_KEY;

  if (!secret) {
    // In development mode, allow unsigned webhooks if secret is not yet configured
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    const computedBuf = Buffer.from(computedSignature, "utf8");
    const headerBuf = Buffer.from(signatureHeader, "utf8");

    if (computedBuf.length !== headerBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, headerBuf);
  } catch {
    return false;
  }
}

/**
 * In-memory fallback event ledger for local dev/testing
 */
const inMemoryProcessedEvents = new Set<string>();

/**
 * Dispatches and persists webhook events idempotently.
 */
export class CJWebhookDispatcher {
  private processedEventIds = new Set<string>();

  /**
   * Processes incoming CJ webhook event.
   * Ensures messageId deduplication and asynchronous safe execution.
   */
  async processEvent(payload: CJWebhookPayload): Promise<{ duplicate: boolean; handled: boolean; action?: string }> {
    const messageId = payload.messageId || `evt_${payload.sendTime}_${payload.messageType}`;

    // 1. Idempotency Check
    if (this.processedEventIds.has(messageId) || inMemoryProcessedEvents.has(messageId)) {
      return { duplicate: true, handled: false };
    }

    this.processedEventIds.add(messageId);
    inMemoryProcessedEvents.add(messageId);

    if (this.processedEventIds.size > 10000) {
      const first = Array.from(this.processedEventIds).slice(0, 1000);
      for (const id of first) this.processedEventIds.delete(id);
    }

    // Persist event in database in background if Supabase is configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      supabase
        .from("webhook_events")
        .insert({
          source: "CJ",
          event_type: payload.messageType,
          event_id: messageId,
          payload,
          processed: true,
          received_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
        })
        .catch(() => {});
    }

    // 2. Event Topic Dispatcher
    const data = payload.data || {};
    let action = "processed";

    switch (payload.messageType) {
      case "ORDER":
      case "ORDER_STATUS_UPDATE": {
        const orderNum = (data.orderNumber || data.orderNum) as string;
        const cjStatus = (data.orderStatus || data.status) as string;
        const trackingNum = (data.trackingNumber || data.trackNumber) as string | undefined;
        const trackingUrl = (data.trackingUrl || data.trackUrl) as string | undefined ||
          (trackingNum ? `https://www.17track.net/en/track?nums=${trackingNum}` : undefined);
        const carrier = (data.logisticName || data.carrier || "CJ Packet Express") as string;

        if (orderNum) {
          const isShipped = cjStatus === "SHIPPED" || Boolean(trackingNum);
          const isDelivered = cjStatus === "DELIVERED";
          const newStatus = isDelivered ? "delivered" : isShipped ? "shipped" : undefined;

          if (isSupabaseConfigured()) {
            const supabase = getSupabaseServerClient();
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (newStatus) updates.fulfillment_status = newStatus;
            if (trackingNum) updates.tracking_number = trackingNum;
            if (trackingUrl) updates.tracking_url = trackingUrl;

            await supabase.from("orders").update(updates).eq("order_number", orderNum).catch(() => {});
          }

          const o = dbStore.getOrderByNumber(orderNum) || dbStore.getOrder(orderNum);
          if (o) {
            dbStore.updateOrder(o.id, {
              fulfillmentStatus: (newStatus as any) || o.fulfillmentStatus,
              trackingNumber: trackingNum || o.trackingNumber,
              trackingUrl: trackingUrl || o.trackingUrl,
            });
          }

          // Update customer via transactional email
          await this.notifyCustomerOfTracking({
            orderNumber: orderNum,
            trackingNumber: trackingNum,
            trackingUrl,
            carrier,
            isDelivered,
            localOrder: o,
          });
        }
        action = "order_updated";
        break;
      }

      case "STOCK":
      case "INVENTORY_CHANGE": {
        const vid = data.variantId as string;
        const stock = Number(data.inventory);
        if (vid && !isNaN(stock)) {
          if (isSupabaseConfigured()) {
            const supabase = getSupabaseServerClient();
            await supabase
              .from("product_variants")
              .update({ inventory_quantity: Math.max(0, stock), updated_at: new Date().toISOString() })
              .eq("external_variant_id", vid)
              .catch(() => {});
          }
        }
        action = "stock_updated";
        break;
      }

      case "LOGISTICS":
      case "SHIPPING_TRACKING_UPDATE": {
        const trackingNum = (data.trackingNumber || data.trackNumber) as string;
        const orderNum = (data.orderNumber || data.orderNum) as string;
        const trackingUrl = (data.trackingUrl || data.trackUrl) as string ||
          (trackingNum ? `https://www.17track.net/en/track?nums=${trackingNum}` : `https://www.17track.net/en/track?nums=${trackingNum}`);
        const carrier = (data.logisticName || data.carrier || "CJ Packet Express") as string;

        if (trackingNum && orderNum) {
          if (isSupabaseConfigured()) {
            const supabase = getSupabaseServerClient();
            await supabase
              .from("orders")
              .update({
                fulfillment_status: "shipped",
                tracking_number: trackingNum,
                tracking_url: trackingUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("order_number", orderNum)
              .catch(() => {});
          }

          const o = dbStore.getOrderByNumber(orderNum) || dbStore.getOrder(orderNum);
          if (o) {
            dbStore.updateOrder(o.id, {
              fulfillmentStatus: "shipped",
              trackingNumber: trackingNum,
              trackingUrl: trackingUrl,
            });
          }

          // Update customer via transactional email
          await this.notifyCustomerOfTracking({
            orderNumber: orderNum,
            trackingNumber: trackingNum,
            trackingUrl,
            carrier,
            isDelivered: false,
            localOrder: o,
          });
        }
        action = "logistics_updated";
        break;
      }

      case "PRODUCT":
      case "PRODUCT_CHANGE": {
        // Safe update: updates sync status without overwriting manual store description (Rule 40)
        const pid = data.productId as string;
        if (pid && isSupabaseConfigured()) {
          const supabase = getSupabaseServerClient();
          supabase
            .from("cj_products")
            .update({
              sync_status: "synced",
              last_synced_at: new Date().toISOString(),
            })
            .eq("cj_product_id", pid)
            .then(() => {})
            .catch(() => {});
        }
        action = "product_synced";
        break;
      }

      default:
        action = `received_${payload.messageType.toLowerCase()}`;
    }

    return { duplicate: false, handled: true, action };
  }

  private async notifyCustomerOfTracking(params: {
    orderNumber: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
    isDelivered?: boolean;
    localOrder?: any;
  }): Promise<void> {
    const { orderNumber, trackingNumber, trackingUrl, carrier, isDelivered, localOrder } = params;

    let email = localOrder?.email;
    let customerName = localOrder?.shippingAddress?.fullName || "Valued Customer";
    let orderId = localOrder?.id || orderNumber;

    if (!email && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: dbOrd } = await supabase
          .from("orders")
          .select("id, email, notes")
          .eq("order_number", orderNumber)
          .single();
        if (dbOrd) {
          orderId = dbOrd.id;
          email = dbOrd.email;
          const addr =
            typeof dbOrd.notes === "object"
              ? dbOrd.notes?.shippingAddress
              : typeof dbOrd.notes === "string"
              ? (() => { try { return JSON.parse(dbOrd.notes)?.shippingAddress; } catch { return null; } })()
              : null;
          if (addr?.fullName) customerName = addr.fullName;
        }
      } catch {
        // Fallback
      }
    }

    if (!email) return;

    if (isDelivered) {
      const deliveredKey = `deliv_${orderNumber}`;
      if (!dbStore.hasNotificationEvent(orderId, "order_delivered", deliveredKey)) {
        dbStore.recordNotificationEvent({
          orderId,
          notificationType: "order_delivered",
          eventReference: deliveredKey,
          recipient: email,
          status: "sent",
        });

        await emailService.send({
          to: { email, name: customerName },
          subject: `Delivered: Your package has arrived | MYCHOICE.in`,
          template: "order_delivered",
          data: {
            orderNumber,
          },
        }).catch(() => {});
      }
      return;
    }

    if (trackingNumber) {
      const trackingKey = `track_${trackingNumber}`;
      if (!dbStore.hasNotificationEvent(orderId, "order_shipped", trackingKey)) {
        dbStore.recordNotificationEvent({
          orderId,
          notificationType: "order_shipped",
          eventReference: trackingKey,
          recipient: email,
          status: "sent",
        });

        await emailService.send({
          to: { email, name: customerName },
          subject: `Shipped: Your order ${orderNumber} is on the way | MYCHOICE.in`,
          template: "order_shipped",
          data: {
            orderNumber,
            trackingNumber,
            trackingUrl: trackingUrl || `https://www.17track.net/en/track?nums=${trackingNumber}`,
            carrier: carrier || "CJ Packet Express",
          },
        }).catch(() => {});
      }
    }
  }
}

export const cjWebhookDispatcher = new CJWebhookDispatcher();

/**
 * Manages product-specific CJ webhook subscriptions (Required for CJ post-July 2026 rules).
 */
export async function subscribeCJProduct(
  cjProductId: string,
  topics: Array<"PRODUCT" | "STOCK" | "ORDER" | "LOGISTICS"> = ["PRODUCT", "STOCK"]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  try {
    const supabase = getSupabaseServerClient();
    for (const topic of topics) {
      await supabase.from("cj_webhook_subscriptions").upsert(
        {
          cj_product_id: cjProductId,
          topic,
          status: "active",
          subscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cj_product_id, topic" }
      );
    }
    return true;
  } catch (err) {
    console.warn(`[CJ Webhook Subscription] Failed for ${cjProductId}:`, err);
    return false;
  }
}

/**
 * Fetches all tracked CJ webhook subscriptions.
 */
export async function getCJSubscriptions(): Promise<CJWebhookSubscription[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "sub_1",
        cjProductId: "CJ_PROD_1001",
        topic: "STOCK",
        status: "active",
        subscribedAt: new Date().toISOString(),
      },
      {
        id: "sub_2",
        cjProductId: "CJ_PROD_1001",
        topic: "PRODUCT",
        status: "active",
        subscribedAt: new Date().toISOString(),
      },
    ];
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("cj_webhook_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((d: any) => ({
    id: d.id,
    cjProductId: d.cj_product_id,
    localProductId: d.local_product_id,
    topic: d.topic,
    status: d.status,
    subscribedAt: d.subscribed_at,
    lastEventAt: d.last_event_at,
  }));
}
