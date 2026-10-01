import { isSupabaseConfigured, getSupabaseBrowserClient } from "./client";

const WISHLIST_STORAGE_KEY = "mychoice_wishlist";

/**
 * Retrieves the customer's wishlisted product IDs.
 */
export async function getWishlistProductIds(customerId?: string): Promise<string[]> {
  if (typeof window === "undefined") return [];

  // If Supabase is configured and customerId is present
  if (isSupabaseConfigured() && customerId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("customer_id", customerId);

      if (!error && data) {
        return data.map((item: any) => item.product_id);
      }
    } catch (err) {
      console.warn("[Wishlist] Supabase sync error, falling back to local storage:", err);
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Toggles a product in the wishlist.
 */
export async function toggleWishlistItem(productId: string, customerId?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let currentIds: string[] = [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    currentIds = raw ? JSON.parse(raw) : [];
  } catch {
    currentIds = [];
  }

  const exists = currentIds.includes(productId);
  let nextIds: string[];

  if (exists) {
    nextIds = currentIds.filter((id) => id !== productId);
  } else {
    nextIds = [...currentIds, productId];
  }

  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(nextIds));

  // Sync to Supabase if available
  if (isSupabaseConfigured() && customerId) {
    try {
      const supabase = getSupabaseBrowserClient();
      if (exists) {
        await supabase
          .from("wishlist_items")
          .delete()
          .match({ customer_id: customerId, product_id: productId });
      } else {
        await supabase
          .from("wishlist_items")
          .insert({ customer_id: customerId, product_id: productId });
      }
    } catch (err) {
      console.warn("[Wishlist] Remote sync error:", err);
    }
  }

  window.dispatchEvent(new CustomEvent("wishlist_updated", { detail: nextIds }));
  return !exists;
}
