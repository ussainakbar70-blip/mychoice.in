/**
 * Centralized Money & Currency Precision Utility
 * 
 * Prevents IEEE 754 floating-point rounding errors (e.g., 0.1 + 0.2 !== 0.3)
 * Operates in integer minor units (paise for INR, cents for USD/EUR).
 */

/**
 * Converts a decimal monetary amount to integer minor units (e.g., ₹499.50 -> 49950 paise).
 */
export function toPaise(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/**
 * Converts integer minor units back to decimal monetary amount (e.g., 49950 paise -> 499.50).
 */
export function fromPaise(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Adds two monetary amounts with integer precision.
 */
export function addMoney(a: number, b: number): number {
  return fromPaise(toPaise(a) + toPaise(b));
}

/**
 * Subtracts b from a with integer precision, clamping to 0 if negative.
 */
export function subtractMoney(a: number, b: number): number {
  return fromPaise(Math.max(0, toPaise(a) - toPaise(b)));
}

/**
 * Multiplies an amount by a factor with proper rounding.
 */
export function multiplyMoney(amount: number, factor: number): number {
  return fromPaise(Math.round(toPaise(amount) * factor));
}

/**
 * Calculates a percentage discount on an amount, optionally capped by maxDiscount.
 */
export function calculatePercentageDiscount(
  amount: number,
  percentage: number,
  maxDiscount?: number
): number {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const rawDiscount = (amount * safePercentage) / 100;
  const rounded = fromPaise(toPaise(rawDiscount));
  if (maxDiscount !== undefined && maxDiscount > 0) {
    return Math.min(rounded, maxDiscount);
  }
  return rounded;
}

/**
 * Formats an amount into localized US Dollar format (e.g. $29.00 or $29).
 */
export function formatUSD(amount: number, includeDecimals = true): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Formats an amount into localized Indian Rupee currency format (e.g. ₹1,299).
 */
export function formatINR(amount: number, includeDecimals = false): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Compares two monetary amounts for exact equality within 1 paisa tolerance.
 */
export function areAmountsEqual(a: number, b: number): boolean {
  return Math.abs(toPaise(a) - toPaise(b)) === 0;
}
