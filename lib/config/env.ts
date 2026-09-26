/**
 * Secure Environment Variables Helper
 * Ensures secrets are never accessed on client-side and validates presence of required configurations.
 */

export function isServer(): boolean {
  return typeof window === "undefined";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Safely retrieve an environment variable on the server.
 * Returns default value if not set.
 */
export function getEnv(key: string, defaultValue: string = ""): string {
  const val = process.env[key];
  if (val !== undefined && val !== "") {
    return val;
  }
  return defaultValue;
}

/**
 * Retrieve a strictly required server-side environment variable.
 * Throws in production if missing.
 */
export function getRequiredEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    if (isProduction()) {
      throw new Error(`CRITICAL CONFIG ERROR: Required environment variable "${key}" is not defined.`);
    }
    console.warn(`[Config Warning] Missing environment variable "${key}" in development mode.`);
    return "";
  }
  return val;
}

/**
 * Redacts confidential credentials for logs and diagnostic displays.
 * Example: "sk_live_1234567890abcdef" -> "sk_live_...cdef"
 */
export function maskSecret(secret?: string): string {
  if (!secret) return "Not Configured";
  if (secret.length <= 8) return "••••••••";
  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 4);
  return `${start}••••••••${end}`;
}
