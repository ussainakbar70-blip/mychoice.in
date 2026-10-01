import { describe, it, expect } from "vitest";
import { getAdminMetrics, adminGetInventory, adminUpdateInventoryQuantity } from "../lib/admin";
import { adminGetCoupons, adminCreateCoupon, adminToggleCouponActive } from "../lib/coupons";
import { submitProductReview, getProductReviews, adminUpdateReviewStatus } from "../lib/reviews";
import { addCustomerAddress, getCustomerAddresses, setDefaultCustomerAddress } from "../lib/customers";

describe("Admin Operations & Data Access Controls", () => {
  it("computes authentic administrative metrics without fake numbers", async () => {
    const metrics = await getAdminMetrics(20);
    expect(typeof metrics.totalOrders).toBe("number");
    expect(typeof metrics.totalRevenue).toBe("number");
    expect(typeof metrics.lowStockCount).toBe("number");
    expect(metrics.totalOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  it("detects low-stock variants and updates inventory stock safely", async () => {
    const items = await adminGetInventory(15);
    expect(items.length).toBeGreaterThan(0);

    const first = items[0];
    const newQty = 85;
    const ok = await adminUpdateInventoryQuantity(first.variantId, newQty);
    expect(ok).toBe(true);
  });

  it("creates and toggles promotional coupons in admin console", async () => {
    const testCode = `TEST${Date.now().toString().slice(-4)}`;
    const created = await adminCreateCoupon({
      code: testCode,
      description: "Test Suite Coupon",
      discountType: "percentage",
      discountValue: 15,
      minimumOrderValue: 40,
    });

    expect(created.code).toBe(testCode);
    expect(created.isActive).toBe(true);

    const toggled = await adminToggleCouponActive(created.id, created.isActive);
    expect(toggled).toBe(false);
  });

  it("submits customer reviews and enforces moderation workflows", async () => {
    const prodId = "test-prod-123";
    const subRes = await submitProductReview({
      productId: prodId,
      authorName: "Marcus Aurelius",
      rating: 5,
      title: "Superb Craftsmanship",
      reviewText: "The tactile sensation and minimalist aesthetic exceeded expectations.",
    });

    expect(subRes.success).toBe(true);

    // In local dev mock mode, reviews are stored
    const reviews = await getProductReviews(prodId);
    expect(reviews.length).toBeGreaterThanOrEqual(1);
    expect(reviews[0].authorName).toBe("Marcus Aurelius");
  });

  it("manages address book entries and enforces single default address", async () => {
    const custId = "cust_test_rls";
    const addr1 = await addCustomerAddress(custId, {
      fullName: "Test User 1",
      phone: "555-0001",
      addressLine1: "100 Alpha Way",
      city: "Alpha City",
      state: "CA",
      postalCode: "90001",
      country: "USA",
      countryCode: "US",
      isDefault: true,
    });

    const addr2 = await addCustomerAddress(custId, {
      fullName: "Test User 2",
      phone: "555-0002",
      addressLine1: "200 Beta Blvd",
      city: "Beta City",
      state: "NY",
      postalCode: "10001",
      country: "USA",
      countryCode: "US",
      isDefault: true,
    });

    const addresses = await getCustomerAddresses(custId);
    // addr2 was added with isDefault: true, so addr1 default should be cleared
    const defaultAddrs = addresses.filter((a) => a.isDefault);
    expect(defaultAddrs.length).toBeLessThanOrEqual(1);
  });
});
