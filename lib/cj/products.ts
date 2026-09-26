import { cjHttpClient } from "./client";
import { CJProductItem, CJProductListResult, CJApiResponse } from "./types";

export interface CJProductSearchParams {
  pageNum?: number;
  pageSize?: number;
  productName?: string;
  categoryId?: string;
  countryCode?: string;
}

export async function getCJProducts(
  params: CJProductSearchParams = {}
): Promise<CJApiResponse<CJProductListResult>> {
  return await cjHttpClient.request<CJProductListResult>("/v1/product/list", {
    method: "GET",
    params: {
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20,
      productName: params.productName,
      categoryId: params.categoryId,
      countryCode: params.countryCode,
    },
  });
}

export async function getCJProductDetail(pid: string): Promise<CJApiResponse<CJProductItem>> {
  return await cjHttpClient.request<CJProductItem>("/v1/product/query", {
    method: "GET",
    params: { pid },
  });
}
