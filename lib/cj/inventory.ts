import { cjHttpClient } from "./client";
import { CJApiResponse } from "./types";
import { isCJConfigured } from "./index";

export interface CJStockQueryItem {
  vid: string;
  sku?: string;
  inventory: number;
}

export interface CJStockBatchResult {
  successful: number;
  failed: number;
  updatedVariants: {
    vid: string;
    oldStock?: number;
    newStock: number;
  }[];
  errors: string[];
}

/**
 * Queries real-time inventory from CJ Dropshipping API v2.
 * Supports batching up to 50 variant IDs per request to respect rate limits.
 */
export async function queryCJInventory(variantIds: string[]): Promise<CJApiResponse<CJStockQueryItem[]>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    // Return mock stock data for development
    const mockItems: CJStockQueryItem[] = variantIds.map((vid) => ({
      vid,
      inventory: Math.floor(Math.random() * 80) + 15,
    }));
    return {
      code: 200,
      result: true,
      message: "Success (Mock)",
      data: mockItems,
    };
  }

  // CJ API v2 stock endpoint
  return await cjHttpClient.request<CJStockQueryItem[]>("/product/stock/queryByVid", {
    method: "POST",
    body: {
      vids: variantIds,
    },
  });
}

/**
 * Batched inventory synchronizer with rate-limit delays and chunking.
 */
export async function syncInventoryInBatches(
  variantIds: string[],
  batchSize: number = 30,
  delayMsBetweenBatches: number = 350
): Promise<CJStockBatchResult> {
  const result: CJStockBatchResult = {
    successful: 0,
    failed: 0,
    updatedVariants: [],
    errors: [],
  };

  const chunks: string[][] = [];
  for (let i = 0; i < variantIds.length; i += batchSize) {
    chunks.push(variantIds.slice(i, i + batchSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const response = await queryCJInventory(chunk);
      if (response.code === 200 && Array.isArray(response.data)) {
        for (const item of response.data) {
          result.successful++;
          result.updatedVariants.push({
            vid: item.vid,
            newStock: item.inventory,
          });
        }
      } else {
        result.failed += chunk.length;
        result.errors.push(`Batch ${i + 1} failed: ${response.message || "Unknown CJ error"}`);
      }
    } catch (err: unknown) {
      result.failed += chunk.length;
      result.errors.push(`Batch ${i + 1} exception: ${err instanceof Error ? err.message : "Error"}`);
    }

    if (i < chunks.length - 1 && delayMsBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMsBetweenBatches));
    }
  }

  return result;
}
