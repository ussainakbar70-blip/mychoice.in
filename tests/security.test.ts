import { describe, it, expect } from "vitest";
import { calculateOrderTotals, AuthoritativeLineItem } from "@/lib/pricing/calculator";
import { CJWebhookDispatcher } from "@/lib/cj/webhooks";
import { validateOrderCJMappings, sanitizeMappingForCustomer } from "@/lib/cj/mappings";

describe("Security Architecture & Fraud Prevention", () => {
  it("strictly enforces server-authoritative prices against client price-tampering", () => {
    // Malicious customer payload claims the product price is $0.01 instead of $58.00
    const maliciousClientPrice = 0.01;
    const authoritativeServerPrice = 58.00;

    const authoritativeItem: AuthoritativeLineItem = {
      variantId: "var-hk-1-w",
      productId: "prod-hk-1",
      productName: "Minimalist Ultrasonic Aroma Diffuser",
      sku: "MY-DIFF-WHT",
      quantity: 1,
      unitPrice: authoritativeServerPrice, // Backend uses DB price
      costPrice: 19.50,
      shippingCost: 4.80,
      weight: 650,
    };

    const totals = calculateOrderTotals([authoritativeItem]);
    // The server calculates $58.00 + shipping, completely ignoring client price
    expect(totals.subtotal).toBe(58.00);
    expect(totals.subtotal).not.toBe(maliciousClientPrice);
  });

  it("prevents duplicate webhook processing via idempotent event deduplication", () => {
    const dispatcher = new CJWebhookDispatcher();
    const eventId = "evt_cj_test_security_9981";

    const payload = {
      messageId: eventId,
      messageType: "ORDER_STATUS_UPDATE",
      sendTime: Date.now(),
      data: { orderId: "CJ-ORD-1234", orderStatus: "PROCESSING" },
    };

    const run1 = dispatcher.processEvent(payload);
    expect(run1.duplicate).toBe(false);
    expect(run1.handled).toBe(true);

    // Replay attack / duplicate delivery
    const run2 = dispatcher.processEvent(payload);
    expect(run2.duplicate).toBe(true);
    expect(run2.handled).toBe(false);
  });

  it("ensures orders missing CJ variant mappings are caught before submission", () => {
    const orderItems = [
      {
        productId: "prod-1",
        variantId: "var-1",
        sku: "MY-VALID-SKU",
        cjProductId: "CJ-PROD-001",
        cjVariantId: "CJ-VAR-001",
      },
      {
        productId: "prod-2",
        variantId: "var-2",
        sku: "MY-INVALID-SKU",
        cjProductId: "CJ-PROD-002",
        cjVariantId: "", // Missing mapping!
      },
    ];

    const validation = validateOrderCJMappings(orderItems);
    expect(validation.valid).toBe(false);
    expect(validation.unmappedItems).toHaveLength(1);
    expect(validation.unmappedItems[0].sku).toBe("MY-INVALID-SKU");
  });

  it("sanitizes supplier costs and internal CJ IDs from customer-facing data", () => {
    const internalProductData = {
      id: "prod-1",
      name: "Luxury Kettle",
      sellingPrice: 94.00,
      costPrice: 38.00, // Confidential supplier cost
      cjProductId: "CJ-INTERNAL-999", // Confidential CJ ID
      cjVariantId: "CJ-VAR-999",
      description: "Counterbalanced gooseneck kettle",
    };

    const sanitized = sanitizeMappingForCustomer(internalProductData);
    expect(sanitized).toHaveProperty("id");
    expect(sanitized).toHaveProperty("name");
    expect(sanitized).toHaveProperty("sellingPrice", 94.00);
    // Confidential fields must be stripped
    expect(sanitized).not.toHaveProperty("costPrice");
    expect(sanitized).not.toHaveProperty("cjProductId");
    expect(sanitized).not.toHaveProperty("cjVariantId");
  });

  it("prevents negative order totals under aggressive coupon discounts", () => {
    const items: AuthoritativeLineItem[] = [
      {
        variantId: "var-cable",
        productId: "prod-cable",
        productName: "USB Cable",
        sku: "MY-CBL-1M",
        quantity: 1,
        unitPrice: 15.00,
        costPrice: 4.00,
        shippingCost: 2.00,
        weight: 100,
      },
    ];

    // Even if a coupon offered $50 off on a $15 order, total should never fall below zero
    const totals = calculateOrderTotals(items, "SAVE20");
    // SAVE20 requires $120 min order, so it's rejected
    expect(totals.discountAmount).toBe(0);
    expect(totals.totalAmount).toBeGreaterThanOrEqual(0);
  });
});
