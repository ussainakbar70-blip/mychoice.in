import { DEMO_COUPONS } from "@/lib/db/seed-data";
import { SITE_CONFIG } from "@/lib/config/site";

export interface AuthoritativeLineItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  shippingCost: number;
  weight: number;
  cjProductId?: string;
  cjVariantId?: string;
}

export interface OrderPricingResult {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponApplied?: {
    code: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  errors: string[];
}

export interface AdminProfitCalculation {
  sellingPrice: number;
  costPrice: number;
  shippingCost: number;
  estimatedPaymentFee: number;
  estimatedTax: number;
  netProfit: number;
  marginPercent: number;
  isBelowThreshold: boolean;
}

/**
 * Calculates authoritative order totals server-side.
 * Strictly prevents client-side price tampering.
 */
export function calculateOrderTotals(
  items: AuthoritativeLineItem[],
  couponCode?: string,
  freeShippingThreshold = SITE_CONFIG.thresholds.freeShippingUsd,
  standardShippingFee = 9.95
): OrderPricingResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      errors: ["Order must contain at least one item."],
    };
  }

  // Calculate authoritative subtotal
  let subtotal = 0;
  for (const item of items) {
    if (item.quantity <= 0) {
      errors.push(`Invalid quantity for item ${item.productName}`);
      continue;
    }
    if (item.unitPrice < 0) {
      errors.push(`Invalid price for item ${item.productName}`);
      continue;
    }
    subtotal += Number((item.unitPrice * item.quantity).toFixed(2));
  }
  subtotal = Number(subtotal.toFixed(2));

  // Handle coupon validation
  let discountAmount = 0;
  let couponApplied: OrderPricingResult["couponApplied"] = undefined;

  if (couponCode && couponCode.trim()) {
    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = DEMO_COUPONS.find((c) => c.code === normalizedCode && c.isActive);

    if (!coupon) {
      errors.push(`Coupon code "${couponCode}" is invalid or expired.`);
    } else if (coupon.minimumOrderValue && subtotal < coupon.minimumOrderValue) {
      errors.push(`Coupon "${coupon.code}" requires a minimum order of $${coupon.minimumOrderValue.toFixed(2)}.`);
    } else {
      if (coupon.discountType === "percentage") {
        let rawDiscount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maximumDiscount && rawDiscount > coupon.maximumDiscount) {
          rawDiscount = coupon.maximumDiscount;
        }
        discountAmount = Number(rawDiscount.toFixed(2));
      } else if (coupon.discountType === "fixed") {
        discountAmount = Math.min(coupon.discountValue, subtotal);
      }

      couponApplied = {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      };
    }
  }

  // Calculate shipping (free if subtotal meets threshold)
  const shippingAmount = subtotal >= freeShippingThreshold ? 0.0 : standardShippingFee;

  // Tax calculation (e.g. 0% for standard international dropship or configurable)
  const taxAmount = 0.0;

  // Authoritative total
  const totalAmount = Math.max(0, Number((subtotal - discountAmount + shippingAmount + taxAmount).toFixed(2)));

  return {
    subtotal,
    discountAmount,
    shippingAmount,
    taxAmount,
    totalAmount,
    couponApplied,
    errors,
  };
}

/**
 * Calculates profit margins and alerts if below minimum threshold (Admin only).
 */
export function calculateProfitMargin(
  sellingPrice: number,
  costPrice: number,
  shippingCost = 0,
  taxRatePercent = 0,
  paymentFeePercent = 2.9,
  paymentFixedFee = 0.30,
  minimumMarginPercent = SITE_CONFIG.thresholds.minimumMarginPercent
): AdminProfitCalculation {
  const safeSelling = Math.max(0, sellingPrice);
  const safeCost = Math.max(0, costPrice);
  const safeShipping = Math.max(0, shippingCost);

  const estimatedPaymentFee = safeSelling > 0 ? (safeSelling * (paymentFeePercent / 100)) + paymentFixedFee : 0;
  const estimatedTax = safeSelling * (taxRatePercent / 100);

  const netProfit = Number((safeSelling - safeCost - safeShipping - estimatedPaymentFee - estimatedTax).toFixed(2));
  const marginPercent = safeSelling > 0 ? Number(((netProfit / safeSelling) * 100).toFixed(1)) : 0;

  return {
    sellingPrice: safeSelling,
    costPrice: safeCost,
    shippingCost: safeShipping,
    estimatedPaymentFee: Number(estimatedPaymentFee.toFixed(2)),
    estimatedTax: Number(estimatedTax.toFixed(2)),
    netProfit,
    marginPercent,
    isBelowThreshold: marginPercent < minimumMarginPercent,
  };
}
