import { cjAuthManager } from "./auth";
import { cjMockProvider } from "./mock";
import { getCJProducts, getCJProductDetail, CJProductSearchParams } from "./products";
import { createCJOrder, getCJOrderDetail } from "./orders";
import { calculateCJFreight, getCJTracking, CJFreightParams } from "./logistics";
import { verifyCJWebhookSignature, cjWebhookDispatcher } from "./webhooks";
import { queryCJInventory, syncInventoryInBatches } from "./inventory";
import { getCJVariants, getCJVariantDetail } from "./variants";
import { validateOrderCJMappings, sanitizeMappingForCustomer } from "./mappings";
import { CJCreateOrderRequest, CJApiResponse, CJProductListResult, CJProductItem, CJCreateOrderResult, CJOrderDetailResult } from "./types";

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
  return Boolean(process.env.CJ_CLIENT_ID && process.env.CJ_CLIENT_SECRET) || Boolean(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN);
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
  async getProducts(params: CJProductSearchParams = {}): Promise<CJApiResponse<CJProductListResult>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.getProducts(params.pageNum, params.pageSize);
    }
    return await getCJProducts(params);
  },

  async getProductDetail(pid: string): Promise<CJApiResponse<CJProductItem>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.getProductDetail(pid);
    }
    return await getCJProductDetail(pid);
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

  async syncInventory(vids: string[]) {
    return await syncInventoryInBatches(vids);
  },

  async createOrder(request: CJCreateOrderRequest): Promise<CJApiResponse<CJCreateOrderResult>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.createOrder(request);
    }
    return await createCJOrder(request);
  },

  async getOrderDetail(orderId: string): Promise<CJApiResponse<CJOrderDetailResult>> {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.getOrderDetail(orderId);
    }
    return await getCJOrderDetail(orderId);
  },

  async calculateFreight(params: CJFreightParams) {
    if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
      return await cjMockProvider.calculateFreight(params.endCountryCode);
    }
    return await calculateCJFreight(params);
  },

  validateMappings: validateOrderCJMappings,
  sanitizeMapping: sanitizeMappingForCustomer,
  getTracking: getCJTracking,
  verifyWebhook: verifyCJWebhookSignature,
  processWebhook: (payload: any) => cjWebhookDispatcher.processEvent(payload),
  getStatus: getCJEnvironmentStatus,
};
