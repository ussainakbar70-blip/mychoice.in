import { describe, it, expect } from "vitest";
import { calculateOrderTotals, calculateProfitMargin, AuthoritativeLineItem } from "@/lib/pricing/calculator";

describe("Authoritative Order Pricing & Tampering Protection", () => {
  const sampleItems: AuthoritativeLineItem[] = [
    {
      variantId: "var-1",
      productId: "prod-1",
      productName: "Ultrasonic Diffuser",
      sku: "MY-DIFF-WHT",
      quantity: 2,
      unitPrice: 58.0, // Authoritative price: $58.00
      costPrice: 19.5,
      shippingCost: 4.8,
      weight: 650,
    },
  ];

  it("calculates accurate subtotal from server prices regardless of client claims", () => {
    const result = calculateOrderTotals(sampleItems);
    expect(result.subtotal).toBe(116.0); // 2 * $58.00
    expect(result.discountAmount).toBe(0);
    // Subtotal $116 >= free shipping threshold $75 -> Shipping is 0
    expect(result.shippingAmount).toBe(0.0);
    expect(result.totalAmount).toBe(116.0);
    expect(result.errors).toHaveLength(0);
  });

  it("adds standard shipping when subtotal is below free shipping threshold", () => {
    const smallOrder: AuthoritativeLineItem[] = [
      {
        variantId: "var-cable",
        productId: "prod-cable",
        productName: "Fast Charge Cable",
        sku: "MY-CBL-2M",
        quantity: 1,
        unitPrice: 24.0, // $24 < $75
        costPrice: 6.8,
        shippingCost: 2.2,
        weight: 140,
      },
    ];

    const result = calculateOrderTotals(smallOrder);
    expect(result.subtotal).toBe(24.0);
    expect(result.shippingAmount).toBe(9.95);
    expect(result.totalAmount).toBe(33.95);
  });

  it("validates and applies WELCOME10 coupon correctly", () => {
    const result = calculateOrderTotals(sampleItems, "WELCOME10");
    expect(result.subtotal).toBe(116.0);
    // 10% of 116 = 11.60
    expect(result.discountAmount).toBe(11.6);
    expect(result.totalAmount).toBe(104.4);
    expect(result.couponApplied?.code).toBe("WELCOME10");
  });

  it("rejects coupon when minimum order requirement is not reached", () => {
    const smallOrder: AuthoritativeLineItem[] = [
      {
        variantId: "var-cable",
        productId: "prod-cable",
        productName: "Fast Charge Cable",
        sku: "MY-CBL-2M",
        quantity: 1,
        unitPrice: 24.0, // WELCOME10 requires $50 min order
        costPrice: 6.8,
        shippingCost: 2.2,
        weight: 140,
      },
    ];

    const result = calculateOrderTotals(smallOrder, "WELCOME10");
    expect(result.discountAmount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("requires a minimum order");
  });

  it("accurately calculates admin profit margins and flags threshold warnings", () => {
    // Selling: $58, Cost: $19.50, Shipping: $4.80, Payment fee: 2.9% + $0.30
    const margin = calculateProfitMargin(58, 19.5, 4.8);
    expect(margin.sellingPrice).toBe(58);
    expect(margin.costPrice).toBe(19.5);
    expect(margin.netProfit).toBeGreaterThan(30);
    expect(margin.marginPercent).toBeGreaterThan(50);
    expect(margin.isBelowThreshold).toBe(false);

    // Losing or low margin scenario
    const lowMargin = calculateProfitMargin(25, 20, 4.0);
    expect(lowMargin.marginPercent).toBeLessThan(35);
    expect(lowMargin.isBelowThreshold).toBe(true);
  });
});
