import { describe, it, expect } from "vitest";
import { getProducts, getProductBySlug } from "../lib/db/products";
import { getCategories, getCategoryBySlug } from "../lib/db/categories";
import { sanitizeCustomerProduct } from "../lib/products";
import { DEMO_PRODUCTS } from "../lib/db/seed-data";

describe("Products & Categories Subsystem", () => {
  it("loads 8 core store categories with valid slugs", async () => {
    const categories = await getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(8);

    const homeKitchen = categories.find((c) => c.slug === "home-kitchen");
    expect(homeKitchen).toBeDefined();
    expect(homeKitchen?.name).toBe("Home & Kitchen");
  });

  it("filters products by category slug", async () => {
    const categories = await getCategories();
    const homeKitchen = categories.find((c) => c.slug === "home-kitchen");
    const res = await getProducts({ categorySlug: "home-kitchen" });
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products.every((p) => p.categoryId === homeKitchen?.id)).toBe(true);
  });

  it("searches products by title and description accurately", async () => {
    const res = await getProducts({ search: "diffuser" });
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products[0].name.toLowerCase()).toContain("diffuser");
  });

  it("filters products within specified price ranges", async () => {
    const min = 30;
    const max = 60;
    const res = await getProducts({ minPrice: min, maxPrice: max });
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products.every((p) => p.basePrice >= min && p.basePrice <= max)).toBe(true);
  });

  it("sorts products by price ascending (price-low)", async () => {
    const res = await getProducts({ sort: "price-low" });
    for (let i = 0; i < res.products.length - 1; i++) {
      expect(res.products[i].basePrice).toBeLessThanOrEqual(res.products[i + 1].basePrice);
    }
  });

  it("sanitizes customer-facing product payloads to prevent leakage of internal costs", () => {
    const raw = DEMO_PRODUCTS[0];
    const sanitized = sanitizeCustomerProduct(raw);

    for (const variant of sanitized.variants) {
      expect(variant.costPrice).toBe(0);
      expect(variant.shippingCost).toBe(0);
    }
  });
});
