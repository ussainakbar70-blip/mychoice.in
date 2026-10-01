import {
  getProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
  getProductsSync,
  getProductBySlugSync,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProductPublish,
  adminToggleProductFlag,
  ProductFilters,
  PaginatedProducts,
} from "@/lib/db/products";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";
import { DEMO_PRODUCTS, SeedProduct } from "@/lib/db/seed-data";

export {
  getProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
  getProductsSync,
  getProductBySlugSync,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProductPublish,
  adminToggleProductFlag,
};
export type { ProductFilters, PaginatedProducts };

/**
 * Sanitizes a product object before sending to a public client or customer API.
 * Strips confidential supplier data: costPrice, internal supplier margins, internal fulfillment notes.
 */
export function sanitizeCustomerProduct(product: SeedProduct): SeedProduct {
  return {
    ...product,
    variants: product.variants.map((v) => ({
      ...v,
      costPrice: 0, // Zeroed out for public customer safety
      shippingCost: 0, // Zeroed out from direct variant exposure
    })),
  };
}

/**
 * Admin: Soft delete / archive product. Preserves historical order integrity.
 */
export async function adminArchiveProduct(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("products")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id);
    return !error;
  }

  const existing = DEMO_PRODUCTS.find((p) => p.id === id);
  if (existing) {
    existing.status = "archived";
    return true;
  }
  return false;
}
