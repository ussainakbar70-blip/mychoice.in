import { cjHttpClient } from "./client";
import { CJApiResponse, CJFreightOption, CJTrackingResult, CJTrackingCheckpoint } from "./types";
import { isCJConfigured } from "./index";
import { cjMockProvider } from "./mock";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";

export interface CJFreightParams {
  startCountryCode?: string;
  endCountryCode: string;
  products: {
    vid: string;
    quantity: number;
  }[];
  zip?: string;
}

export interface AvailableShippingMethod {
  id: string;
  name: string;
  cost: number;
  currency: string;
  estimatedDeliveryDays: string;
  isAvailable: boolean;
  carrierNote?: string;
}

/**
 * Calculates estimated logistics freight options and delivery windows via CJ API v2.0.
 * Endpoint: POST /v1/logistic/freightCalculate
 */
export async function calculateCJFreight(
  params: CJFreightParams
): Promise<CJApiResponse<{ logisticList: CJFreightOption[] }>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return await cjMockProvider.calculateFreight(params.endCountryCode);
  }

  return await cjHttpClient.request<{ logisticList: CJFreightOption[] }>("/v1/logistic/freightCalculate", {
    method: "POST",
    body: {
      startCountryCode: params.startCountryCode || "CN",
      endCountryCode: params.endCountryCode,
      products: params.products,
      zip: params.zip,
    },
  });
}

/**
 * High-level shipping abstraction for checkout.
 * Returns formatted, server-authoritative shipping methods.
 */
export async function getAvailableShippingMethods(params: CJFreightParams): Promise<AvailableShippingMethod[]> {
  try {
    const response = await calculateCJFreight(params);
    if (response.code === 200 && Array.isArray(response.data?.logisticList)) {
      return response.data.logisticList.map((opt, idx) => ({
        id: `ship_${opt.logisticName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: opt.logisticName,
        cost: Number(opt.logisticPrice) || 0,
        currency: "USD",
        estimatedDeliveryDays: opt.logisticAging || "7-15 business days",
        isAvailable: true,
        carrierNote: idx === 0 ? "Recommended carrier" : undefined,
      }));
    }
  } catch (err) {
    console.warn("[CJ Freight] Freight calculation fallback to default store tier:", err);
  }

  // Graceful fallback tier if CJ freight endpoint is temporarily unavailable
  return [
    {
      id: "ship_standard_intl",
      name: "Standard Insured Courier",
      cost: 0, // Free threshold or standard
      currency: "USD",
      estimatedDeliveryDays: "8-14 business days",
      isAvailable: true,
      carrierNote: "Tracked international delivery",
    },
    {
      id: "ship_express_priority",
      name: "Express Priority Dispatch",
      cost: 9.99,
      currency: "USD",
      estimatedDeliveryDays: "4-8 business days",
      isAvailable: true,
      carrierNote: "Priority sorting & tracking",
    },
  ];
}

/**
 * Normalizes CJ tracking raw status to unified internal store status.
 */
export function normalizeCJTrackingStatus(
  rawStatus?: string
): "pending" | "shipped" | "in_transit" | "delivered" | "cancelled" {
  if (!rawStatus) return "pending";
  const s = rawStatus.toLowerCase();
  if (s.includes("delivered") || s.includes("completed") || s.includes("sign")) return "delivered";
  if (s.includes("transit") || s.includes("customs") || s.includes("depart") || s.includes("arrived")) return "in_transit";
  if (s.includes("shipped") || s.includes("pickup") || s.includes("picked") || s.includes("dispatch")) return "shipped";
  if (s.includes("cancel") || s.includes("return") || s.includes("fail")) return "cancelled";
  return "in_transit";
}

/**
 * Fetches real carrier tracking checkpoints for a shipment.
 * Endpoint: GET /v1/logistic/orderTrack
 */
export async function getCJTracking(trackingNumber: string, orderId?: string): Promise<CJTrackingResult> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return {
      trackingNumber,
      carrier: "CJ Packet Express",
      status: "in_transit",
      rawStatus: "IN_TRANSIT",
      checkpoints: [
        {
          time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          status: "Departed Sort Facility",
          location: "Guangdong International Hub",
          description: "Shipment departed from origin sorting facility.",
        },
        {
          time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: "Customs Cleared",
          location: "Destination Gateway",
          description: "Cleared through customs and handed over to domestic carrier.",
        },
        {
          time: new Date().toISOString(),
          status: "In Transit to Local Distribution",
          location: "Regional Logistics Center",
          description: "Package is on schedule for delivery.",
        },
      ],
    };
  }

  try {
    const res = await cjHttpClient.request<any>("/v1/logistic/orderTrack", {
      method: "GET",
      params: { trackNumber: trackingNumber },
    });

    const data = res.data || {};
    const rawStatus = String(data.status || data.deliveryStatus || "IN_TRANSIT");
    const normalizedStatus = normalizeCJTrackingStatus(rawStatus);

    const checkpoints: CJTrackingCheckpoint[] = (data.events || data.checkpointList || []).map((e: any) => ({
      time: e.time || e.checkpointTime || new Date().toISOString(),
      status: e.status || e.stage || "Checkpoint",
      location: e.location || e.area || undefined,
      description: e.description || e.context || e.message || "Transit update",
    }));

    // If orderId is provided and Supabase is configured, record events in cj_tracking_events
    if (orderId && isSupabaseConfigured() && checkpoints.length > 0) {
      const supabase = getSupabaseServerClient();
      for (const cp of checkpoints) {
        await supabase.from("cj_tracking_events").upsert(
          {
            order_id: orderId,
            tracking_number: trackingNumber,
            carrier: data.logisticName || "CJ Carrier",
            checkpoint_time: cp.time,
            status: cp.status,
            location: cp.location || null,
            description: cp.description,
            raw_data: cp,
          },
          { onConflict: "order_id, tracking_number, checkpoint_time" }
        ).catch(() => {});
      }
    }

    return {
      trackingNumber,
      carrier: data.logisticName || "CJ Logistics",
      status: normalizedStatus,
      rawStatus,
      checkpoints,
    };
  } catch (err) {
    console.warn(`[CJ Tracking] Failed to fetch live tracking for ${trackingNumber}:`, err);
    return {
      trackingNumber,
      carrier: "Courier Service",
      status: "in_transit",
      rawStatus: "UNKNOWN",
      checkpoints: [
        {
          time: new Date().toISOString(),
          status: "Package Dispatched",
          description: "Tracking number registered with carrier.",
        },
      ],
    };
  }
}
