import { describe, it, expect } from "vitest";
import { formatMoney, convertCurrency } from "@/lib/currency";

describe("Multi-Currency Conversion & Localization", () => {
  it("formats base USD amounts cleanly", () => {
    expect(formatMoney(100, "USD")).toBe("$100.00");
    expect(formatMoney(58.5, "USD")).toBe("$58.50");
  });

  it("converts and formats INR currency according to Indian standard", () => {
    // 1 USD = 86.5 INR -> 100 USD = 8,650 INR
    const inrFormatted = formatMoney(100, "INR");
    expect(inrFormatted).toContain("₹");
    expect(inrFormatted).toContain("8,650");
  });

  it("formats European Euro amounts correctly", () => {
    // 1 USD = 0.92 EUR -> 100 USD = €92.00
    const eurFormatted = formatMoney(100, "EUR");
    expect(eurFormatted).toContain("€");
    expect(eurFormatted).toContain("92.00");
  });

  it("formats British Pound amounts correctly", () => {
    // 1 USD = 0.79 GBP -> 100 USD = £79.00
    const gbpFormatted = formatMoney(100, "GBP");
    expect(gbpFormatted).toContain("£");
    expect(gbpFormatted).toContain("79.00");
  });

  it("formats UAE Dirham amounts correctly", () => {
    // 1 USD = 3.67 AED -> 100 USD = AED 367.00
    const aedFormatted = formatMoney(100, "AED");
    expect(aedFormatted).toContain("AED");
    expect(aedFormatted).toContain("367.00");
  });
});
