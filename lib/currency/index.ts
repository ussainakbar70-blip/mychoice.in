import { SupportedCurrency } from "@/lib/config/site";

export interface CurrencyMeta {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rateAgainstUSD: number; // e.g. 1 USD = 86.5 INR
  fractionDigits: number;
}

export const CURRENCY_METADATA: Record<SupportedCurrency, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", rateAgainstUSD: 1.0, fractionDigits: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", rateAgainstUSD: 86.5, fractionDigits: 0 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", rateAgainstUSD: 0.92, fractionDigits: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", rateAgainstUSD: 0.79, fractionDigits: 2 },
  AED: { code: "AED", symbol: "AED ", name: "UAE Dirham", rateAgainstUSD: 3.67, fractionDigits: 2 },
};

/**
 * Converts a base USD amount to target currency.
 */
export function convertCurrency(
  amountInUSD: number,
  targetCurrency: SupportedCurrency = "USD",
  customRates?: Record<SupportedCurrency, number>
): number {
  if (isNaN(amountInUSD)) return 0;
  const rate = customRates?.[targetCurrency] ?? CURRENCY_METADATA[targetCurrency]?.rateAgainstUSD ?? 1.0;
  return amountInUSD * rate;
}

/**
 * Formats a base USD amount into the target currency's localized string.
 */
export function formatMoney(
  amountInUSD: number,
  targetCurrency: SupportedCurrency = "USD",
  customRates?: Record<SupportedCurrency, number>
): string {
  const converted = convertCurrency(amountInUSD, targetCurrency, customRates);
  const meta = CURRENCY_METADATA[targetCurrency] || CURRENCY_METADATA.USD;

  if (targetCurrency === "INR") {
    // Localize Indian format (e.g. ₹5,490)
    return `${meta.symbol}${Math.round(converted).toLocaleString("en-IN")}`;
  }

  return `${meta.symbol}${converted.toLocaleString("en-US", {
    minimumFractionDigits: meta.fractionDigits,
    maximumFractionDigits: meta.fractionDigits,
  })}`;
}
