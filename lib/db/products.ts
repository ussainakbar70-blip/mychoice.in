import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { CATEGORIES, DEMO_PRODUCTS, SeedProduct, SeedVariant } from "./seed-data";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "./client";

export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  search?: string;
  status?: "published" | "draft" | "archived" | "all";
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: "featured" | "bestseller" | "newest" | "price-low" | "price-high" | "rating";
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: SeedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Normalizes Supabase database rows into SeedProduct
 */
export function mapRowsToProduct(
  p: Database["public"]["Tables"]["products"]["Row"],
  variants: Database["public"]["Tables"]["product_variants"]["Row"][] = [],
  images: Database["public"]["Tables"]["product_images"]["Row"][] = []
): SeedProduct {
  const mappedVariants: SeedVariant[] = variants.map((v) => ({
    id: v.id,
    cjVariantId: v.cj_variant_id || "",
    sku: v.sku,
    option1Name: v.option_1_name || undefined,
    option1Value: v.option_1_value || undefined,
    option2Name: v.option_2_name || undefined,
    option2Value: v.option_2_value || undefined,
    price: Number(v.price),
    compareAtPrice: v.compare_at_price ? Number(v.compare_at_price) : undefined,
    costPrice: Number(v.cost_price || 0),
    shippingCost: Number(v.shipping_cost || 0),
    inventoryQuantity: v.inventory_quantity,
    weight: Number(v.weight || 0),
    isActive: v.is_active,
  }));

  const mappedImages = images
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      publicUrl: img.public_url,
      altText: img.alt_text || p.name,
      isPrimary: img.is_primary,
      sortOrder: img.sort_order,
    }));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.short_description || "",
    description: p.description || "",
    categoryId: p.category_id || "",
    brandName: p.brand_name || "MYCHOICE",
    status: p.status,
    riskStatus: p.risk_status,
    featured: p.featured,
    bestseller: p.bestseller,
    newArrival: p.new_arrival,
    seoTitle: p.seo_title || `${p.name} | MYCHOICE.in`,
    seoDescription: p.seo_description || p.short_description || "",
    baseCurrency: p.base_currency,
    basePrice: Number(p.base_price),
    compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : undefined,
    cjProductId: p.cj_product_id || "",
    cjProductSku: p.cj_product_sku || "",
    productRating: Number(p.product_rating),
    reviewCount: p.review_count,
    images: mappedImages.length > 0 ? mappedImages : [
      {
        id: `img-${p.id}`,
        publicUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80",
        altText: p.name,
        isPrimary: true,
        sortOrder: 0,
      }
    ],
    variants: mappedVariants.length > 0 ? mappedVariants : [
      {
        id: `var-${p.id}`,
        cjVariantId: p.cj_product_id || "",
        sku: p.cj_product_sku || `SKU-${p.id.slice(0, 6)}`,
        price: Number(p.base_price),
        compareAtPrice: p.compare_at_price ? Number(p.compare_at_price) : undefined,
        costPrice: Number(p.base_price) * 0.4,
        shippingCost: 5.0,
        inventoryQuantity: 50,
        weight: 0.5,
        isActive: true,
      }
    ],
    specifications: {},
    features: [],
  };
}

/**
 * Filter & sort in-memory products array (used for seed fallback).
 */
function applyLocalFilters(products: SeedProduct[], filters?: ProductFilters): SeedProduct[] {
  let result = [...products];

  if (filters?.status && filters.status !== "all") {
    result = result.filter((p) => p.status === filters.status);
  } else if (!filters?.status) {
    result = result.filter((p) => p.status === "published");
  }

  if (filters?.categoryId) {
    result = result.filter((p) => p.categoryId === filters.categoryId);
  } else if (filters?.categorySlug) {
    const matchedCategory = CATEGORIES.find((c) => c.slug === filters.categorySlug);
    if (matchedCategory) {
      result = result.filter((p) => p.categoryId === matchedCategory.id);
    }
  }

  if (filters?.featured !== undefined) {
    result = result.filter((p) => p.featured === filters.featured);
  }

  if (filters?.bestseller !== undefined) {
    result = result.filter((p) => p.bestseller === filters.bestseller);
  }

  if (filters?.newArrival !== undefined) {
    result = result.filter((p) => p.newArrival === filters.newArrival);
  }

  if (filters?.minPrice !== undefined) {
    result = result.filter((p) => p.basePrice >= (filters.minPrice ?? 0));
  }

  if (filters?.maxPrice !== undefined) {
    result = result.filter((p) => p.basePrice <= (filters.maxPrice ?? Infinity));
  }

  if (filters?.inStockOnly) {
    result = result.filter((p) => p.variants.some((v) => v.inventoryQuantity > 0));
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.cjProductSku.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q))
    );
  }

  // Sorting
  switch (filters?.sort) {
    case "price-low":
      result.sort((a, b) => a.basePrice - b.basePrice);
      break;
    case "price-high":
      result.sort((a, b) => b.basePrice - a.basePrice);
      break;
    case "rating":
      result.sort((a, b) => b.productRating - a.productRating);
      break;
    case "newest":
      result.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
      break;
    case "bestseller":
      result.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0));
      break;
    case "featured":
    default:
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }

  return result;
}

/**
 * Fetch products from Supabase with full filtering, sorting & pagination.
 * Falls back to development seed data if Supabase is offline or unconfigured.
 */
export async function getProducts(filters?: ProductFilters): Promise<PaginatedProducts> {
  const page = Math.max(1, filters?.page || 1);
  const limit = Math.max(1, filters?.limit || 24);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      let query = supabase.from("products").select("*, product_variants(*), product_images(*)", { count: "exact" });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      } else if (!filters?.status) {
        query = query.eq("status", "published");
      }

      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      } else if (filters?.categorySlug) {
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.categorySlug)
          .single();
        if (catData?.id) {
          query = query.eq("category_id", catData.id);
        }
      }

      if (filters?.featured !== undefined) {
        query = query.eq("featured", filters.featured);
      }

      if (filters?.bestseller !== undefined) {
        query = query.eq("bestseller", filters.bestseller);
      }

      if (filters?.newArrival !== undefined) {
        query = query.eq("new_arrival", filters.newArrival);
      }

      if (filters?.minPrice !== undefined) {
        query = query.gte("base_price", filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        query = query.lte("base_price", filters.maxPrice);
      }

      if (filters?.search) {
        const term = `%${filters.search}%`;
        query = query.or(`name.ilike.${term},short_description.ilike.${term},cj_product_sku.ilike.${term}`);
      }

      // Sort
      switch (filters?.sort) {
        case "price-low":
          query = query.order("base_price", { ascending: true });
          break;
        case "price-high":
          query = query.order("base_price", { ascending: false });
          break;
        case "rating":
          query = query.order("product_rating", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("featured", { ascending: false }).order("created_at", { ascending: false });
          break;
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data && data.length > 0) {
        const total = count || data.length;
        const products: SeedProduct[] = data.map((item: any) =>
          mapRowsToProduct(item, item.product_variants || [], item.product_images || [])
        );
        return {
          products,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
      if (error) {
        console.warn("[Supabase Warning] Products query fallback:", error.message);
      }
    } catch (err) {
      console.warn("[Supabase Warning] Products fetch error, utilizing seed fallback:", err);
    }
  }

  // Development Seed Fallback
  const filtered = applyLocalFilters(DEMO_PRODUCTS, filters);
  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    products: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Fetch product by slug from Supabase.
 */
export async function getProductBySlug(slug: string): Promise<SeedProduct | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), product_images(*)")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        return mapRowsToProduct(data as any, (data as any).product_variants || [], (data as any).product_images || []);
      }
    } catch {
      // Fallback
    }
  }

  return DEMO_PRODUCTS.find((p) => p.slug === slug) || null;
}

/**
 * Fetch product by ID from Supabase.
 */
export async function getProductById(id: string): Promise<SeedProduct | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), product_images(*)")
        .eq("id", id)
        .single();

      if (!error && data) {
        return mapRowsToProduct(data as any, (data as any).product_variants || [], (data as any).product_images || []);
      }
    } catch {
      // Fallback
    }
  }

  return DEMO_PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * Fetch related products from same category.
 */
export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit: number = 4
): Promise<SeedProduct[]> {
  const result = await getProducts({
    categoryId,
    status: "published",
    limit: limit + 1,
  });

  return result.products.filter((p) => p.id !== excludeId).slice(0, limit);
}

/**
 * Synchronous products retrieval for instant SSR or static pages.
 */
export function getProductsSync(filters?: ProductFilters): PaginatedProducts {
  const page = Math.max(1, filters?.page || 1);
  const limit = Math.max(1, filters?.limit || 24);
  const filtered = applyLocalFilters(DEMO_PRODUCTS, filters);
  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    products: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getProductBySlugSync(slug: string): SeedProduct | null {
  return DEMO_PRODUCTS.find((p) => p.slug === slug) || null;
}

/**
 * Admin: Create a new product with variants and images in Supabase.
 */
export async function adminCreateProduct(productData: {
  slug: string;
  name: string;
  shortDescription?: string;
  description?: string;
  categoryId?: string;
  brandName?: string;
  status?: "draft" | "published" | "archived";
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  basePrice: number;
  compareAtPrice?: number;
  cjProductId?: string;
  cjProductSku?: string;
  seoTitle?: string;
  seoDescription?: string;
  variants?: Array<{
    sku: string;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    shippingCost?: number;
    inventoryQuantity?: number;
    option1Name?: string;
    option1Value?: string;
    option2Name?: string;
    option2Value?: string;
  }>;
  images?: Array<{
    publicUrl: string;
    altText?: string;
    isPrimary?: boolean;
    sortOrder?: number;
  }>;
}): Promise<SeedProduct> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();

    // 1. Insert product
    const { data: newProd, error: prodErr } = await supabase
      .from("products")
      .insert({
        slug: productData.slug,
        name: productData.name,
        short_description: productData.shortDescription || null,
        description: productData.description || null,
        category_id: productData.categoryId || null,
        brand_name: productData.brandName || "MYCHOICE",
        status: productData.status || "draft",
        featured: productData.featured || false,
        bestseller: productData.bestseller || false,
        new_arrival: productData.newArrival || false,
        base_price: productData.basePrice,
        compare_at_price: productData.compareAtPrice || null,
        cj_product_id: productData.cjProductId || null,
        cj_product_sku: productData.cjProductSku || null,
        seo_title: productData.seoTitle || null,
        seo_description: productData.seoDescription || null,
      })
      .select()
      .single();

    if (prodErr) throw prodErr;

    // 2. Insert variants
    if (productData.variants && productData.variants.length > 0) {
      await supabase.from("product_variants").insert(
        productData.variants.map((v) => ({
          product_id: newProd.id,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compareAtPrice || null,
          cost_price: v.costPrice || 0,
          shipping_cost: v.shippingCost || 0,
          inventory_quantity: v.inventoryQuantity || 0,
          option_1_name: v.option1Name || null,
          option_1_value: v.option1Value || null,
          option_2_name: v.option2Name || null,
          option_2_value: v.option2Value || null,
        }))
      );
    }

    // 3. Insert images
    if (productData.images && productData.images.length > 0) {
      await supabase.from("product_images").insert(
        productData.images.map((img, idx) => ({
          product_id: newProd.id,
          public_url: img.publicUrl,
          alt_text: img.altText || productData.name,
          is_primary: img.isPrimary ?? idx === 0,
          sort_order: img.sortOrder ?? idx,
        }))
      );
    }

    return (await getProductById(newProd.id))!;
  }

  // Fallback in-memory
  const id = `prod-${Date.now()}`;
  const newProduct: SeedProduct = {
    id,
    slug: productData.slug,
    name: productData.name,
    shortDescription: productData.shortDescription || "",
    description: productData.description || "",
    categoryId: productData.categoryId || "cat-home-kitchen",
    brandName: productData.brandName || "MYCHOICE",
    status: productData.status || "draft",
    riskStatus: "normal",
    featured: productData.featured || false,
    bestseller: productData.bestseller || false,
    newArrival: productData.newArrival || false,
    seoTitle: productData.seoTitle || productData.name,
    seoDescription: productData.seoDescription || "",
    baseCurrency: "USD",
    basePrice: productData.basePrice,
    compareAtPrice: productData.compareAtPrice,
    cjProductId: productData.cjProductId || "",
    cjProductSku: productData.cjProductSku || "",
    productRating: 5.0,
    reviewCount: 0,
    images: productData.images?.map((img, i) => ({
      id: `img-${id}-${i}`,
      publicUrl: img.publicUrl,
      altText: img.altText || productData.name,
      isPrimary: img.isPrimary ?? i === 0,
      sortOrder: img.sortOrder ?? i,
    })) || [],
    variants: productData.variants?.map((v, i) => ({
      id: `var-${id}-${i}`,
      cjVariantId: "",
      sku: v.sku,
      option1Name: v.option1Name,
      option1Value: v.option1Value,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: v.costPrice || 0,
      shippingCost: v.shippingCost || 0,
      inventoryQuantity: v.inventoryQuantity || 0,
      weight: 0.5,
      isActive: true,
    })) || [],
    specifications: {},
    features: [],
  };

  DEMO_PRODUCTS.unshift(newProduct);
  return newProduct;
}

/**
 * Admin: Update product in Supabase.
 */
export async function adminUpdateProduct(
  id: string,
  updates: Partial<SeedProduct>
): Promise<SeedProduct | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const payload: Partial<Database["public"]["Tables"]["products"]["Update"]> = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.brandName !== undefined) payload.brand_name = updates.brandName;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.featured !== undefined) payload.featured = updates.featured;
    if (updates.bestseller !== undefined) payload.bestseller = updates.bestseller;
    if (updates.newArrival !== undefined) payload.new_arrival = updates.newArrival;
    if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
    if (updates.compareAtPrice !== undefined) payload.compare_at_price = updates.compareAtPrice;
    if (updates.seoTitle !== undefined) payload.seo_title = updates.seoTitle;
    if (updates.seoDescription !== undefined) payload.seo_description = updates.seoDescription;

    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) throw error;
    return getProductById(id);
  }

  const existing = DEMO_PRODUCTS.find((p) => p.id === id);
  if (!existing) return null;
  Object.assign(existing, updates);
  return existing;
}

/**
 * Admin: Toggle product publish status.
 */
export async function adminToggleProductPublish(id: string, currentStatus: string): Promise<string> {
  const newStatus = currentStatus === "published" ? "draft" : "published";
  await adminUpdateProduct(id, { status: newStatus as any });
  return newStatus;
}

/**
 * Admin: Toggle product merchandising flag (featured, bestseller, newArrival).
 */
export async function adminToggleProductFlag(
  id: string,
  flag: "featured" | "bestseller" | "newArrival",
  currentVal: boolean
): Promise<boolean> {
  const newVal = !currentVal;
  await adminUpdateProduct(id, { [flag]: newVal });
  return newVal;
}
