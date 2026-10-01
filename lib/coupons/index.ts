import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/client";
import { DEMO_COUPONS } from "@/lib/db/seed-data";

export interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderValue: number | null;
  maximumDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface CouponValidationResult {
  isValid: boolean;
  coupon?: CouponItem;
  discountAmount: number;
  errorMessage?: string;
}

/**
 * Validates a coupon code against authoritative database records and calculates discount.
 */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const normalized = code.trim().toUpperCase();

  let coupon: CouponItem | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", normalized)
        .single();

      if (!error && data) {
        coupon = {
          id: data.id,
          code: data.code,
          description: data.description,
          discountType: data.discount_type as "percentage" | "fixed",
          discountValue: Number(data.discount_value),
          minimumOrderValue: data.minimum_order_value ? Number(data.minimum_order_value) : null,
          maximumDiscount: data.maximum_discount ? Number(data.maximum_discount) : null,
          usageLimit: data.usage_limit,
          usedCount: data.used_count,
          startsAt: data.starts_at,
          expiresAt: data.expires_at,
          isActive: data.is_active,
        };
      }
    } catch (err) {
      console.warn("[Coupon] DB lookup failed, checking local seed:", err);
    }
  }

  // Local fallback
  if (!coupon) {
    const demo = DEMO_COUPONS.find((c) => c.code === normalized);
    if (demo) {
      coupon = {
        id: demo.id,
        code: demo.code,
        description: demo.description,
        discountType: demo.discountType,
        discountValue: demo.discountValue,
        minimumOrderValue: demo.minimumOrderValue || null,
        maximumDiscount: demo.maximumDiscount || null,
        usageLimit: null,
        usedCount: 0,
        startsAt: null,
        expiresAt: null,
        isActive: demo.isActive,
      };
    }
  }

  if (!coupon) {
    return { isValid: false, discountAmount: 0, errorMessage: `Coupon "${code}" is invalid.` };
  }

  if (!coupon.isActive) {
    return { isValid: false, discountAmount: 0, errorMessage: `Coupon "${coupon.code}" is no longer active.` };
  }

  const now = new Date();
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { isValid: false, discountAmount: 0, errorMessage: `Coupon "${coupon.code}" has not started yet.` };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { isValid: false, discountAmount: 0, errorMessage: `Coupon "${coupon.code}" has expired.` };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { isValid: false, discountAmount: 0, errorMessage: `Coupon "${coupon.code}" usage limit has been reached.` };
  }

  if (coupon.minimumOrderValue && subtotal < coupon.minimumOrderValue) {
    return {
      isValid: false,
      discountAmount: 0,
      errorMessage: `Coupon "${coupon.code}" requires a minimum order of $${coupon.minimumOrderValue.toFixed(2)}.`,
    };
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, subtotal);
  discount = Number(discount.toFixed(2));

  return {
    isValid: true,
    coupon,
    discountAmount: discount,
  };
}

/**
 * Admin: Fetch all coupons.
 */
export async function adminGetCoupons(): Promise<CouponItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          description: d.description,
          discountType: d.discount_type,
          discountValue: Number(d.discount_value),
          minimumOrderValue: d.minimum_order_value ? Number(d.minimum_order_value) : null,
          maximumDiscount: d.maximum_discount ? Number(d.maximum_discount) : null,
          usageLimit: d.usage_limit,
          usedCount: d.used_count,
          startsAt: d.starts_at,
          expiresAt: d.expires_at,
          isActive: d.is_active,
        }));
      }
    } catch {
      // Fallback
    }
  }

  return DEMO_COUPONS.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minimumOrderValue: c.minimumOrderValue || null,
    maximumDiscount: c.maximumDiscount || null,
    usageLimit: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    isActive: c.isActive,
  }));
}

/**
 * Admin: Create a new coupon.
 */
export async function adminCreateCoupon(couponData: {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  startsAt?: string;
  expiresAt?: string;
}): Promise<CouponItem> {
  const normalized = couponData.code.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: normalized,
        description: couponData.description || null,
        discount_type: couponData.discountType,
        discount_value: couponData.discountValue,
        minimum_order_value: couponData.minimumOrderValue || null,
        maximum_discount: couponData.maximumDiscount || null,
        usage_limit: couponData.usageLimit || null,
        starts_at: couponData.startsAt || null,
        expires_at: couponData.expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      code: data.code,
      description: data.description,
      discountType: data.discount_type as "percentage" | "fixed",
      discountValue: Number(data.discount_value),
      minimumOrderValue: data.minimum_order_value ? Number(data.minimum_order_value) : null,
      maximumDiscount: data.maximum_discount ? Number(data.maximum_discount) : null,
      usageLimit: data.usage_limit,
      usedCount: data.used_count,
      startsAt: data.starts_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
    };
  }

  const newCoupon: CouponItem = {
    id: `coup_${Date.now()}`,
    code: normalized,
    description: couponData.description || "",
    discountType: couponData.discountType,
    discountValue: couponData.discountValue,
    minimumOrderValue: couponData.minimumOrderValue || null,
    maximumDiscount: couponData.maximumDiscount || null,
    usageLimit: couponData.usageLimit || null,
    usedCount: 0,
    startsAt: couponData.startsAt || null,
    expiresAt: couponData.expiresAt || null,
    isActive: true,
  };

  (DEMO_COUPONS as any[]).push({
    id: newCoupon.id,
    code: newCoupon.code,
    description: newCoupon.description || "",
    discountType: newCoupon.discountType,
    discountValue: newCoupon.discountValue,
    minimumOrderValue: newCoupon.minimumOrderValue ?? 0,
    maximumDiscount: newCoupon.maximumDiscount ?? null,
    isActive: true,
  });

  return newCoupon;
}

/**
 * Admin: Toggle coupon active status.
 */
export async function adminToggleCouponActive(id: string, currentState: boolean): Promise<boolean> {
  const nextState = !currentState;
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("coupons").update({ is_active: nextState }).eq("id", id);
    return nextState;
  }

  const existing = DEMO_COUPONS.find((c) => c.id === id);
  if (existing) {
    existing.isActive = nextState;
  }
  return nextState;
}
