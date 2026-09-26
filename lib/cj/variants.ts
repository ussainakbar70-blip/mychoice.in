import { cjHttpClient } from "./client";
import { CJApiResponse, CJProductVariant } from "./types";
import { cjMockProvider } from "./mock";
import { isCJConfigured } from "./index";

export type CJVariantItem = CJProductVariant;

export interface CJVariantQueryParams {
  pid?: string;
  vid?: string;
  sku?: string;
}

/**
 * Fetch variant details by product ID or variant ID from CJ Open API v2.
 */
export async function getCJVariants(params: CJVariantQueryParams): Promise<CJApiResponse<CJVariantItem[]>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    if (params.pid) {
      const detail = await cjMockProvider.getProductDetail(params.pid);
      return {
        code: 200,
        result: true,
        message: "Success (Mock)",
        data: detail.data?.variants || [],
      };
    }
  }

  return await cjHttpClient.request<CJVariantItem[]>("/product/variant/query", {
    method: "GET",
    params: {
      pid: params.pid,
      vid: params.vid,
      variantSku: params.sku,
    },
  });
}

/**
 * Fetch specific variant detail by VID
 */
export async function getCJVariantDetail(vid: string): Promise<CJApiResponse<CJVariantItem | null>> {
  const res = await getCJVariants({ vid });
  if (res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
    return {
      code: 200,
      result: true,
      message: "Success",
      data: res.data[0],
    };
  }
  return {
    code: res.code,
    result: false,
    message: res.message || "Variant not found",
    data: null,
  };
}
