export interface ProductMapping {
  storeProductId: string;
  storeVariantId: string;
  storeSku: string;
  cjProductId: string;
  cjVariantId: string;
  cjSku: string;
  lastSyncedAt?: string;
  isValid: boolean;
}

export interface MappingValidationResult {
  valid: boolean;
  unmappedItems: {
    productId: string;
    variantId: string;
    sku: string;
  }[];
  errors: string[];
}

/**
 * Validates that all order items have valid, verified CJ variant mappings
 * before attempting to submit an automated order to CJ.
 */
export function validateOrderCJMappings(
  items: {
    productId: string;
    variantId: string;
    sku: string;
    cjProductId?: string;
    cjVariantId?: string;
  }[]
): MappingValidationResult {
  const unmappedItems: { productId: string; variantId: string; sku: string }[] = [];
  const errors: string[] = [];

  for (const item of items) {
    if (!item.cjVariantId || !item.cjVariantId.trim()) {
      unmappedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
      });
      errors.push(`Variant SKU "${item.sku}" lacks a valid CJ Variant ID mapping.`);
    }
  }

  return {
    valid: unmappedItems.length === 0,
    unmappedItems,
    errors,
  };
}

/**
 * Sanitizes mapping objects for customer-facing APIs:
 * NEVER leak supplier costs, CJ credentials, or internal IDs to customer views.
 */
export function sanitizeMappingForCustomer<T extends Record<string, unknown>>(data: T): Omit<T, "cjProductId" | "cjVariantId" | "costPrice"> {
  const copy = { ...data };
  delete copy.cjProductId;
  delete copy.cjVariantId;
  delete copy.costPrice;
  return copy;
}
