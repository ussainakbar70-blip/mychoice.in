import { cjHttpClient } from "./client";
import {
  CJApiResponse,
  CJCreateOrderRequest,
  CJCreateOrderResult,
  CJOrderDetailResult,
  CJConfirmOrderRequest,
  CJConfirmOrderResult,
} from "./types";
import { isCJConfigured } from "./index";
import { cjMockProvider } from "./mock";
import { getSupabaseServerClient, isSupabaseConfigured, dbStore } from "@/lib/db/client";
import { emailService } from "@/lib/email";

export {
  canOrderBeFulfilled,
  fulfillLocalOrder,
  isLiveCJFulfillmentEnabled,
  validateCJShippingAddress,
  resolveOrderCJMappings,
  type FulfillmentEligibilityResult,
  type FulfillmentEligibilityCode,
  type ValidatedCJShippingAddress,
  type FulfillOrderResult,
  type FulfillLocalOrderOptions,
} from "./fulfillment";

/**
 * Creates an order directly with CJdropshipping via official Open API v2.0.
 * Default payType is 3 (create order without immediate auto-deduction, awaiting balance or confirmation).
 * Endpoint: POST /v1/shopping/order/createOrderV2
 */
export async function createCJOrder(
  orderData: CJCreateOrderRequest
): Promise<CJApiResponse<CJCreateOrderResult>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return await cjMockProvider.createOrder(orderData);
  }

  return await cjHttpClient.request<CJCreateOrderResult>("/v1/shopping/order/createOrderV2", {
    method: "POST",
    body: orderData,
  });
}

/**
 * Confirms an order previously created in CJdropshipping.
 * Endpoint: POST /v1/shopping/order/confirmOrder
 */
export async function confirmCJOrder(orderId: string): Promise<CJApiResponse<CJConfirmOrderResult>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return {
      code: 200,
      result: true,
      message: "Order confirmed (Development Mock Mode)",
      data: { orderId, status: "CONFIRMED" },
    };
  }

  return await cjHttpClient.request<CJConfirmOrderResult>("/v1/shopping/order/confirmOrder", {
    method: "POST",
    body: { orderId },
  });
}

/**
 * Retrieves the current status, fulfillment progress, and tracking data for a CJ order.
 * Endpoint: GET /v1/shopping/order/getOrderDetail
 */
export async function getCJOrderDetail(orderId: string): Promise<CJApiResponse<CJOrderDetailResult>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return await cjMockProvider.getOrderDetail(orderId);
  }

  return await cjHttpClient.request<CJOrderDetailResult>("/v1/shopping/order/getOrderDetail", {
    method: "GET",
    params: { orderId },
  });
}

export interface SyncOrderTrackingResult {
  success: boolean;
  orderNumber?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  fulfillmentStatus?: string;
  customerNotified?: boolean;
  message: string;
}

/**
 * Synchronizes order fulfillment & tracking data directly from CJdropshipping API.
 * Updates order status to 'shipped' (or 'delivered'), stores waybill tracking codes,
 * and idempotently dispatches transactional tracking notifications to the customer.
 */
export async function syncOrderTracking(orderIdOrNumber: string): Promise<SyncOrderTrackingResult> {
  const isSupabase = isSupabaseConfigured();
  let order: any = null;
  let supabase: any = null;

  if (isSupabase) {
    supabase = getSupabaseServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);
    let query = supabase.from("orders").select("*, order_items(*)");
    if (isUuid) {
      query = query.eq("id", orderIdOrNumber);
    } else {
      query = query.eq("order_number", orderIdOrNumber);
    }
    const { data } = await query.single();
    order = data;
  }

  if (!order) {
    order = dbStore.getOrder(orderIdOrNumber) || dbStore.getOrderByNumber(orderIdOrNumber);
  }

  if (!order) {
    return {
      success: false,
      message: `Order "${orderIdOrNumber}" not found.`,
    };
  }

  const orderId = order.id;
  const orderNumber = order.order_number || order.orderNumber;
  const cjOrderId = order.cj_order_id || order.cjOrderId;

  if (!cjOrderId) {
    return {
      success: false,
      orderNumber,
      fulfillmentStatus: order.fulfillment_status || order.fulfillmentStatus || "unfulfilled",
      message: `Order ${orderNumber} has not been dispatched to CJ Dropshipping yet.`,
    };
  }

  // Fetch live tracking and status from CJ API v2
  const cjRes = await getCJOrderDetail(cjOrderId);
  if (cjRes.code !== 200 || !cjRes.data) {
    return {
      success: false,
      orderNumber,
      fulfillmentStatus: order.fulfillment_status || order.fulfillmentStatus || "submitted_to_cj",
      message: cjRes.message || "Failed to query CJ order details.",
    };
  }

  const cjData = cjRes.data;
  const trackingNumber = (cjData.trackNumber || (cjData as any).trackingNumber) as string | undefined;
  const trackingUrl =
    (cjData.trackUrl || (cjData as any).trackingUrl) as string | undefined ||
    (trackingNumber ? `https://www.17track.net/en/track?nums=${trackingNumber}` : undefined);
  const carrier = (cjData.logisticName || (cjData as any).carrier || "CJ Packet Express") as string;
  const cjStatus = cjData.orderStatus || "";

  let newFulfillmentStatus = order.fulfillment_status || order.fulfillmentStatus;
  if (cjStatus === "DELIVERED") {
    newFulfillmentStatus = "delivered";
  } else if (cjStatus === "SHIPPED" || trackingNumber) {
    newFulfillmentStatus = "shipped";
  }

  // Update order in database
  if (isSupabase && supabase) {
    const updates: Record<string, any> = {
      fulfillment_status: newFulfillmentStatus,
      updated_at: new Date().toISOString(),
    };
    if (trackingNumber) updates.tracking_number = trackingNumber;
    if (trackingUrl) updates.tracking_url = trackingUrl;

    await supabase.from("orders").update(updates).eq("id", orderId);
  }

  dbStore.updateOrder(orderId, {
    fulfillmentStatus: newFulfillmentStatus,
    trackingNumber: trackingNumber || order.trackingNumber,
    trackingUrl: trackingUrl || order.trackingUrl,
  });

  // Check customer notification
  let customerNotified = false;
  const email = order.email;
  let fullName = "Valued Customer";
  const addr =
    order.shippingAddress ||
    order.shipping_address ||
    (typeof order.notes === "object" ? order.notes?.shippingAddress : null);
  if (addr?.fullName) fullName = addr.fullName;

  if (trackingNumber && email) {
    const notifKey = `track_${trackingNumber}`;
    if (!dbStore.hasNotificationEvent(orderId, "order_shipped", notifKey)) {
      dbStore.recordNotificationEvent({
        orderId,
        notificationType: "order_shipped",
        eventReference: notifKey,
        recipient: email,
        status: "sent",
      });

      await emailService.send({
        to: { email, name: fullName },
        subject: `Shipped: Your order ${orderNumber} is on the way | MYCHOICE.in`,
        template: "order_shipped",
        data: {
          orderNumber,
          trackingNumber,
          trackingUrl,
          carrier,
        },
      });

      customerNotified = true;
    }
  }

  return {
    success: true,
    orderNumber,
    trackingNumber,
    trackingUrl,
    carrier,
    fulfillmentStatus: newFulfillmentStatus,
    customerNotified,
    message: trackingNumber
      ? `Tracking synchronized: ${trackingNumber} (${carrier}). Status: ${newFulfillmentStatus}.`
      : `Order status synchronized: ${cjStatus || newFulfillmentStatus}. Tracking code pending courier scan.`,
  };
}
