import { getCategories, getCategoryBySlug, adminCreateCategory, mapRowToCategory } from "@/lib/db/categories";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";
import { CATEGORIES, SeedCategory } from "@/lib/db/seed-data";

export { getCategories, getCategoryBySlug, adminCreateCategory };

/**
 * Admin: Update category details.
 */
export async function adminUpdateCategory(
  id: string,
  updates: Partial<SeedCategory>
): Promise<SeedCategory | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.seoTitle !== undefined) payload.seo_title = updates.seoTitle;
    if (updates.seoDescription !== undefined) payload.seo_description = updates.seoDescription;
    payload.updated_at = new Date().toISOString();

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

/**
 * Admin: Delete or archive category safely.
 * Checks for linked active products first to prevent orphaned records.
 */
export async function adminDeleteCategory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();

    // Check for linked products
    const { count, error: countErr } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);

    if (countErr) return { success: false, error: countErr.message };

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete category: ${count} active product(s) are assigned to it. Please reassign or archive them first.`,
      };
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const index = CATEGORIES.findIndex((c) => c.id === id);
  if (index !== -1) {
    CATEGORIES.splice(index, 1);
  }
  return { success: true };
}
