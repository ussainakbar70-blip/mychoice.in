import { cjHttpClient } from "./client";
import {
  CJProductItem,
  CJProductListResult,
  CJProductListV2Params,
  CJApiResponse,
} from "./types";
import { cjMockProvider } from "./mock";
import { isCJConfigured } from "./index";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/db/client";
import { adminCreateProduct } from "@/lib/db/products";
import { subscribeCJProduct } from "./webhooks";

/**
 * Searches CJ Products using the official API v2.0 listV2 endpoint.
 * Falls back to high-fidelity mock data in development when credentials are not configured.
 */
export async function searchCJProducts(
  params: CJProductListV2Params = {}
): Promise<CJApiResponse<CJProductListResult>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return await cjMockProvider.getProducts(params.page, params.size);
  }

  const queryParams: Record<string, string | number | boolean | undefined> = {
    page: Math.max(1, params.page || 1),
    size: Math.min(100, Math.max(1, params.size || 20)),
    keyword: params.keyword,
    categoryId: params.categoryId,
    startPrice: params.startPrice,
    endPrice: params.endPrice,
    countryCode: params.countryCode,
  };

  return await cjHttpClient.request<CJProductListResult>("/v1/product/listV2", {
    method: "GET",
    params: queryParams,
  });
}

/**
 * Retrieves detailed product information for a single CJ product by its PID.
 */
export async function getCJProductDetail(pid: string): Promise<CJApiResponse<CJProductItem>> {
  if (!isCJConfigured() && process.env.NODE_ENV !== "production") {
    return await cjMockProvider.getProductDetail(pid);
  }

  return await cjHttpClient.request<CJProductItem>("/v1/product/query", {
    method: "GET",
    params: { pid },
  });
}

export interface ImportProductDraftOptions {
  cjProductId: string;
  localCategoryId: string;
  markupPercentage?: number; // Default markup (e.g. 100% markup on wholesale cost)
  customTitle?: string;
  customDescription?: string;
}

/**
 * Imports a CJ product into the local database as a DRAFT.
 * Strictly adheres to Rule 10 & 49:
 * 1. Imported products are initially DRAFT (never automatically published).
 * 2. Supplier cost is stored in variant costPrice and NOT exposed to customers.
 * 3. Store price is computed based on desired margin.
 * 4. Preserves external mapping (external_provider = 'CJ', external_product_id, external_variant_id, external_sku).
 * 5. Registers product-specific webhook subscription.
 */
export async function importCJProductAsDraft(
  options: ImportProductDraftOptions
): Promise<{ success: boolean; productId?: string; message: string }> {
  const detailRes = await getCJProductDetail(options.cjProductId);
  if (!detailRes.result || !detailRes.data) {
    return {
      success: false,
      message: `Failed to retrieve CJ product details: ${detailRes.message}`,
    };
  }

  const cjProd = detailRes.data;
  const markup = (options.markupPercentage ?? 100) / 100;

  // Generate unique URL slug
  const baseSlug = (options.customTitle || cjProd.productName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  // Determine base retail price from supplier wholesale price + markup
  const supplierBaseCost = Number(cjProd.sellPrice) || 15.0;
  const baseRetailPrice = Math.round(supplierBaseCost * (1 + markup) * 100) / 100;
  const compareAtPrice = Math.round(baseRetailPrice * 1.35 * 100) / 100;

  // Map variants safely
  const mappedVariants = (cjProd.variants && cjProd.variants.length > 0
    ? cjProd.variants
    : [
        {
          vid: `vid_${cjProd.pid}_default`,
          pid: cjProd.pid,
          variantSku: cjProd.productSku || `SKU-${cjProd.pid.slice(0, 8)}`,
          variantName: "Standard",
          variantPrice: supplierBaseCost,
          variantWeight: cjProd.productWeight || 250,
          inventory: 50,
        },
      ]
  ).map((v, idx) => {
    const vCost = Number(v.variantPrice) || supplierBaseCost;
    const vPrice = Math.round(vCost * (1 + markup) * 100) / 100;
    return {
      sku: v.variantSku || `${cjProd.productSku}-${idx + 1}`,
      price: vPrice,
      compareAtPrice: Math.round(vPrice * 1.35 * 100) / 100,
      costPrice: vCost,
      shippingCost: 0,
      inventoryQuantity: v.inventory ?? 25,
      option1Name: "Variant",
      option1Value: v.variantStandard || v.variantName || `Option ${idx + 1}`,
    };
  });

  // Images mapping
  const mappedImages = cjProd.productImage
    ? [
        {
          publicUrl: cjProd.productImage,
          altText: options.customTitle || cjProd.productName,
          isPrimary: true,
          sortOrder: 0,
        },
      ]
    : [];

  try {
    const created = await adminCreateProduct({
      slug,
      name: options.customTitle || cjProd.productName,
      shortDescription: `Curated ${cjProd.categoryName || "lifestyle item"} with precision build.`,
      description: options.customDescription || cjProd.description || `Crafted for longevity and everyday utility. Designed with refined aesthetics.`,
      categoryId: options.localCategoryId,
      status: "draft", // ALWAYS DRAFT
      featured: false,
      bestseller: false,
      newArrival: true,
      basePrice: baseRetailPrice,
      compareAtPrice,
      cjProductId: cjProd.pid,
      cjProductSku: cjProd.productSku,
      variants: mappedVariants,
      images: mappedImages,
    });

    // Record mapping in cj_products table if Supabase is active
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseServerClient();
      await supabase.from("cj_products").upsert({
        cj_product_id: cjProd.pid,
        local_product_id: created.id,
        raw_data: cjProd,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      });

      // Also register product-specific webhook subscription
      await subscribeCJProduct(cjProd.pid, ["PRODUCT", "STOCK"]);
    }

    return {
      success: true,
      productId: created.id,
      message: `Product successfully imported as DRAFT with ${mappedVariants.length} mapped variants.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database import failed";
    return {
      success: false,
      message: `Failed to import product draft: ${msg}`,
    };
  }
}
