import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";

export interface ReviewItem {
  id: string;
  productId: string;
  productName?: string;
  customerId?: string;
  authorName: string;
  rating: number;
  title: string | null;
  reviewText: string;
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const LOCAL_REVIEWS_STORAGE_KEY = "mychoice_local_reviews";
let inMemoryReviews: ReviewItem[] = [];

function getLocalReviews(): ReviewItem[] {
  if (typeof window === "undefined") return inMemoryReviews;
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : inMemoryReviews;
  } catch {
    return inMemoryReviews;
  }
}

function saveLocalReviews(reviews: ReviewItem[]) {
  inMemoryReviews = reviews;
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }
}

/**
 * Fetch approved customer reviews for a given product.
 * Returns only genuine, approved reviews.
 */
export async function getProductReviews(productId: string): Promise<ReviewItem[]> {
  if (isSupabaseConfigured() && productId) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          productId: r.product_id,
          customerId: r.customer_id,
          authorName: r.author_name,
          rating: r.rating,
          title: r.title,
          reviewText: r.review_text,
          verifiedPurchase: r.verified_purchase,
          status: r.status,
          createdAt: r.created_at,
        }));
      }
    } catch (err) {
      console.warn("[Reviews] Failed to fetch product reviews:", err);
    }
  }

  // Local fallback: return approved reviews from local storage
  return getLocalReviews().filter((r) => r.productId === productId && r.status === "approved");
}

/**
 * Submit an authentic customer review.
 * Saved as 'pending' for moderation unless admin configured auto-approval.
 */
export async function submitProductReview(data: {
  productId: string;
  authorName: string;
  rating: number;
  title?: string;
  reviewText: string;
  customerId?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!data.authorName || !data.reviewText || data.rating < 1 || data.rating > 5) {
    return { success: false, error: "Please provide a valid rating (1-5), your name, and a review comment." };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("reviews").insert({
        product_id: data.productId,
        customer_id: data.customerId || null,
        author_name: data.authorName.trim(),
        rating: Math.round(data.rating),
        title: data.title?.trim() || null,
        review_text: data.reviewText.trim(),
        status: "pending",
        verified_purchase: Boolean(data.customerId),
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Review submission failed";
      return { success: false, error: msg };
    }
  }

  // Local storage fallback
  const list = getLocalReviews();
  list.unshift({
    id: `rev_${Date.now()}`,
    productId: data.productId,
    customerId: data.customerId,
    authorName: data.authorName,
    rating: data.rating,
    title: data.title || null,
    reviewText: data.reviewText,
    verifiedPurchase: Boolean(data.customerId),
    status: "approved", // auto-approve in local mock mode so user can see it right away
    createdAt: new Date().toISOString(),
  });
  saveLocalReviews(list);
  return { success: true };
}

/**
 * Admin: Fetch all reviews across the store for moderation.
 */
export async function adminGetReviews(): Promise<ReviewItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(name)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          productId: r.product_id,
          productName: r.products?.name,
          customerId: r.customer_id,
          authorName: r.author_name,
          rating: r.rating,
          title: r.title,
          reviewText: r.review_text,
          verifiedPurchase: r.verified_purchase,
          status: r.status,
          createdAt: r.created_at,
        }));
      }
    } catch {
      // Fallback
    }
  }

  return getLocalReviews();
}

/**
 * Admin: Update review moderation status.
 */
export async function adminUpdateReviewStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    return !error;
  }

  const list = getLocalReviews();
  const target = list.find((r) => r.id === id);
  if (target) {
    target.status = status;
    saveLocalReviews(list);
    return true;
  }
  return false;
}

/**
 * Admin: Delete a review.
 */
export async function adminDeleteReview(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    return !error;
  }

  const list = getLocalReviews().filter((r) => r.id !== id);
  saveLocalReviews(list);
  return true;
}
