import { cjHttpClient } from "./client";
import { CJApiResponse, CJFreightOption } from "./types";

export interface CJFreightParams {
  startCountryCode?: string;
  endCountryCode: string;
  products: {
    vid: string;
    quantity: number;
  }[];
  zip?: string;
}

/**
 * Calculates estimated logistics freight options and aging timelines via CJ API v2.0.
 */
export async function calculateCJFreight(
  params: CJFreightParams
): Promise<CJApiResponse<{ logisticList: CJFreightOption[] }>> {
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
 * Fetches real carrier tracking checkpoints for a shipment.
 */
export async function getCJTracking(trackingNumber: string): Promise<CJApiResponse<unknown>> {
  return await cjHttpClient.request<unknown>("/v1/logistic/orderTrack", {
    method: "GET",
    params: { trackNumber: trackingNumber },
  });
}
