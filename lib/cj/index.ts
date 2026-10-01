import { cjAuthManager } from "./auth";
import { cjMockProvider } from "./mock";
import { searchCJProducts, getCJProductDetail, importCJProductAsDraft, ImportProductDraftOptions } from "./products";
import { createCJOrder, confirmCJOrder, getCJOrderDetail, fulfillLocalOrder, canOrderBeFulfilled } from "./orders";
import { calculateCJFreight, getAvailableShippingMethods, getCJTracking, CJFreightParams } from "./logistics";
import { verifyCJWebhookSignature, cjWebhookDispatcher, subscribeCJProduct, getCJSubscriptions } from "./webhooks";
import { queryCJInventory, syncInventoryForMappedVariants } from "./inventory";
import { getCJVariants, getCJVariantDetail } from "./variants";
import { validateOrderCJMappings, sanitizeMappingForCustomer } from "./mappings";
import {
  CJCreateOrderRequest,
  CJApiResponse,
  CJProductListResult,
  CJProductItem,
  CJCreateOrderResult,
  CJOrderDetailResult,
  CJProductListV2Params,
} from "./types";

export * from "./types";
export * from "./auth";
export * from "./client";
export * from "./products";
export * from "./variants";
export * from "./inventory";
export * from "./orders";
export * from "./logistics";
export * from "./webhooks";
export * from "./mappings";
export * from "./errors";
export * from "./mock";

export function isCJConfigured(): boolean {
  return (
    Boolean(process.env.CJ_CLIENT_ID && process.env.CJ_CLIENT_SECRET) ||
    Boolean(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN)
  );
}

export function getCJEnvironmentStatus(): "Connected" | "Development Mock Mode" | "Configuration Required" {
  if (isCJConfigured()) {
    return "Connected";
  }
  if (process.env.NODE_ENV !== "production") {
    return "Development Mock Mode";
  }
  return "Configuration Required";
}

/**
 * Unified CJ Service Facade.
 * Routes to live official CJ Open API v2.0 when credentials exist,
 * or cleanly routes to the development mock provider for local sandbox execution.
 */
export const cjService = {
  async searchProducts(params: CJProductListV2Params = {}): Promise<CJApiResponse<CJProductListResult>> {
    return await searchCJProducts(params);
  },

  async getProducts(params: { pageNum?: number; pageSize?: number; productName?: string } = {}): Promise<CJApiResponse<CJProductListResult>> {
    return await searchCJProducts({ page: params.pageNum, size: params.pageSize, keyword: params.productName });
  },

  async getProductDetail(pid: string): Promise<CJApiResponse<CJProductItem>> {
    return await getCJProductDetail(pid);
  },

  async importProductDraft(options: ImportProductDraftOptions) {
    return await importCJProductAsDraft(options);
  },

  async getVariants(params: { pid?: string; vid?: string; sku?: string }) {
    return await getCJVariants(params);
  },

  async getVariantDetail(vid: string) {
    return await getCJVariantDetail(vid);
  },

  async queryInventory(vids: string[]) {
    return await queryCJInventory(vids);
  },

  async syncInventory() {
    return await syncInventoryForMappedVariants();
  },

  async createOrder(request: CJCreateOrderRequest): Promise<CJApiResponse<CJCreateOrderResult>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.createOrder(request);
    }
    return await createCJOrder(request);
  },

  async confirmOrder(orderId: string) {
    return await confirmCJOrder(orderId);
  },

  async getOrderDetail(orderId: string): Promise<CJApiResponse<CJOrderDetailResult>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.getOrderDetail(orderId);
    }
    return await getCJOrderDetail(orderId);
  },

  async fulfillOrder(orderId: string, options?: { allowTestMode?: boolean; idempotencyKey?: string }) {
    return await fulfillLocalOrder(orderId, options);
  },

  async canOrderBeFulfilled(orderId: string) {
    return await canOrderBeFulfilled(orderId);
  },

  async calculateFreight(params: CJFreightParams) {
    return await calculateCJFreight(params);
  },

  async getShippingMethods(params: CJFreightParams) {
    return await getAvailableShippingMethods(params);
  },

  validateMappings: validateOrderCJMappings,
  sanitizeMapping: sanitizeMappingForCustomer,
  getTracking: getCJTracking,
  verifyWebhook: verifyCJWebhookSignature,
  processWebhook: (payload: any) => cjWebhookDispatcher.processEvent(payload),
  subscribeProduct: subscribeCJProduct,
  getSubscriptions: getCJSubscriptions,
  getStatus: getCJEnvironmentStatus,
  getTokenStatus: () => cjAuthManager.getTokenStatus(),
};
