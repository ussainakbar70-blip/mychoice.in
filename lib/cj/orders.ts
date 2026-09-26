import { cjHttpClient } from "./client";
import { CJApiResponse, CJCreateOrderRequest, CJCreateOrderResult, CJOrderDetailResult } from "./types";

/**
 * Creates an order directly with CJdropshipping via official Open API v2.0.
 * Default payType is 3 (create order without immediate auto-deduction, awaiting balance or confirmation).
 */
export async function createCJOrder(
  orderData: CJCreateOrderRequest
): Promise<CJApiResponse<CJCreateOrderResult>> {
  return await cjHttpClient.request<CJCreateOrderResult>("/v1/shopping/order/createOrderV2", {
    method: "POST",
    body: orderData,
  });
}

/**
 * Retrieves the current status, fulfillment progress, and tracking data for a CJ order.
 */
export async function getCJOrderDetail(orderId: string): Promise<CJApiResponse<CJOrderDetailResult>> {
  return await cjHttpClient.request<CJOrderDetailResult>("/v1/shopping/order/getOrderDetail", {
    method: "GET",
    params: { orderId },
  });
}
