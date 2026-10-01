import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";
import { CATEGORIES, SeedCategory } from "./seed-data";
import { isSupabaseConfigured, getSupabaseBrowserClient } from "./client";

/**
 * Normalizes a database category row into the unified SeedCategory interface.
 */
export function mapRowToCategory(row: Database["public"]["Tables"]["categories"]["Row"]): SeedCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    imageUrl: row.image_url || "",
    sortOrder: row.sort_order,
    isActive: row.is_active,
    seoTitle: row.seo_title || `${row.name} | MYCHOICE.in`,
    seoDescription: row.seo_description || row.description || "",
  };
}

/**
 * Fetch all active categories from Supabase (ordered by sort_order).
 * Falls back transparently to development seed data if Supabase is unconfigured or offline.
 */
export async function getCategories(): Promise<SeedCategory[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(mapRowToCategory);
      }
      if (error) {
        console.warn("[Supabase Warning] Categories query fallback:", error.message);
      }
    } catch (err) {
      console.warn("[Supabase Warning] Categories fetch failed, using seed data:", err);
    }
  }

  // Development Seed Fallback
  return CATEGORIES.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Fetch single category by slug from Supabase.
 */
export async function getCategoryBySlug(slug: string): Promise<SeedCategory | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        return mapRowToCategory(data);
      }
    } catch {
      // Fallback below
    }
  }

  return CATEGORIES.find((c) => c.slug === slug) || null;
}

/**
 * Synchronous categories retrieval for immediate static rendering or SSR fallback.
 */
export function getCategoriesSync(): SeedCategory[] {
  return CATEGORIES.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Synchronous single category retrieval.
 */
export function getCategoryBySlugSync(slug: string): SeedCategory | null {
  return CATEGORIES.find((c) => c.slug === slug) || null;
}

/**
 * Admin: Create a new category in Supabase.
 */
export async function adminCreateCategory(category: {
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}): Promise<SeedCategory> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        slug: category.slug,
        name: category.name,
        description: category.description || null,
        image_url: category.imageUrl || null,
        sort_order: category.sortOrder ?? 0,
        is_active: category.isActive ?? true,
        seo_title: category.seoTitle || null,
        seo_description: category.seoDescription || null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToCategory(data);
  }

  // In-memory mock
  const newCat: SeedCategory = {
    id: `cat-${Date.now()}`,
    slug: category.slug,
    name: category.name,
    description: category.description || "",
    imageUrl: category.imageUrl || "",
    sortOrder: category.sortOrder || CATEGORIES.length + 1,
    isActive: category.isActive ?? true,
    seoTitle: category.seoTitle || category.name,
    seoDescription: category.seoDescription || "",
  };
  CATEGORIES.push(newCat);
  return newCat;
}

/**
 * Admin: Update category in Supabase.
 */
export async function adminUpdateCategory(
  id: string,
  updates: Partial<SeedCategory>
): Promise<SeedCategory | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const payload: Partial<Database["public"]["Tables"]["categories"]["Update"]> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.seoTitle !== undefined) payload.seo_title = updates.seoTitle;
    if (updates.seoDescription !== undefined) payload.seo_description = updates.seoDescription;

    const { data, error } = await supabase
      .from("categories")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return mapRowToCategory(data);
  }

  const existing = CATEGORIES.find((c) => c.id === id);
  if (!existing) return null;
  Object.assign(existing, updates);
  return existing;
}
