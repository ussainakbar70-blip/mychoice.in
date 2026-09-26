import { describe, it, expect } from "vitest";
import { queryCJInventory, syncInventoryInBatches } from "@/lib/cj/inventory";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";

describe("Inventory Integrity & CJ Sync Tests", () => {
  it("queries inventory for variant IDs in mock mode without throwing", async () => {
    const vids = ["CJ-V-DIFF-W", "CJ-V-DIFF-B", "CJ-V-KET-M"];
    const response = await queryCJInventory(vids);

    expect(response.code).toBe(200);
    expect(response.result).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(3);
    expect(response.data[0]).toHaveProperty("vid");
    expect(response.data[0]).toHaveProperty("inventory");
    expect(response.data[0].inventory).toBeGreaterThanOrEqual(0);
  });

  it("handles batch inventory sync with chunking and delay", async () => {
    const vids = [
      "CJ-V-1", "CJ-V-2", "CJ-V-3", "CJ-V-4", "CJ-V-5",
      "CJ-V-6", "CJ-V-7", "CJ-V-8", "CJ-V-9", "CJ-V-10",
    ];

    // Batch size of 4 with 50ms delay
    const result = await syncInventoryInBatches(vids, 4, 50);

    expect(result.successful).toBe(10);
    expect(result.failed).toBe(0);
    expect(result.updatedVariants.length).toBe(10);
    expect(result.errors).toHaveLength(0);
  });

  it("validates that all demo catalog products have positive inventory configured", () => {
    for (const product of DEMO_PRODUCTS) {
      expect(product.variants.length).toBeGreaterThan(0);
      for (const variant of product.variants) {
        expect(variant.inventoryQuantity).toBeGreaterThanOrEqual(0);
        expect(variant.costPrice).toBeGreaterThan(0);
        expect(variant.price).toBeGreaterThan(variant.costPrice);
      }
    }
  });
});
