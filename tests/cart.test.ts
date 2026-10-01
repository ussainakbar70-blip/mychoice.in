import { describe, it, expect, beforeEach } from "vitest";
import { validateAndRefreshCart, mergeGuestCart } from "../lib/cart/service";
import { CartItem } from "../lib/cart/context";
import { DEMO_PRODUCTS } from "../lib/db/seed-data";

describe("Cart Subsystem & Merging Engine", () => {
  const sampleProduct = DEMO_PRODUCTS[0];
  const sampleVariant = sampleProduct.variants[0];

  it("validates and corrects tampered prices against server-authoritative database prices", async () => {
    const tamperedItem: CartItem = {
      variantId: sampleVariant.id,
      productId: sampleProduct.id,
      name: sampleProduct.name,
      price: 0.99, // Tampered price
      image: sampleProduct.images[0].publicUrl,
      sku: sampleVariant.sku,
      quantity: 2,
    };

    const result = await validateAndRefreshCart([tamperedItem]);
    expect(result.items.length).toBe(1);
    expect(result.items[0].price).toBe(sampleVariant.price); // Corrected to authoritative price
    expect(result.hasChanges).toBe(true);
  });

  it("removes invalid or non-existent products from cart", async () => {
    const invalidItem: CartItem = {
      variantId: "non-existent-var",
      productId: "non-existent-prod",
      name: "Ghost Product",
      price: 100,
      image: "",
      sku: "FAKE-SKU",
      quantity: 1,
    };

    const result = await validateAndRefreshCart([invalidItem]);
    expect(result.items.length).toBe(0);
    expect(result.hasChanges).toBe(true);
  });

  it("clamps item quantity if requested exceeds available stock", async () => {
    const excessItem: CartItem = {
      variantId: sampleVariant.id,
      productId: sampleProduct.id,
      name: sampleProduct.name,
      price: sampleVariant.price,
      image: sampleProduct.images[0].publicUrl,
      sku: sampleVariant.sku,
      quantity: sampleVariant.inventoryQuantity + 500, // Excess
    };

    const result = await validateAndRefreshCart([excessItem]);
    expect(result.items[0].quantity).toBe(sampleVariant.inventoryQuantity);
  });

  it("merges guest cart items with existing account cart items seamlessly", async () => {
    const guestItems: CartItem[] = [
      {
        variantId: sampleVariant.id,
        productId: sampleProduct.id,
        name: sampleProduct.name,
        price: sampleVariant.price,
        image: sampleProduct.images[0].publicUrl,
        sku: sampleVariant.sku,
        quantity: 1,
      },
    ];

    const merged = await mergeGuestCart("test-cust-id", guestItems);
    expect(merged.length).toBeGreaterThan(0);
    expect(merged.some((i) => i.variantId === sampleVariant.id)).toBe(true);
  });
});
