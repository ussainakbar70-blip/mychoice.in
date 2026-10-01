/**
 * Security & Observability Logger
 * 
 * Automatically redacts sensitive fields:
 * - Payment card numbers, CVVs
 * - API secrets (Razorpay, CJ, Supabase Service Role)
 * - Bearer tokens and passwords
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /card/i,
  /cvv/i,
  /cvc/i,
  /api[_-]?key/i,
  /client[_-]?secret/i,
  /x-client-secret/i,
];

const CARD_NUMBER_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

/**
 * Deeply redacts sensitive keys and values from objects or strings.
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact credit card numbers
    let sanitized = data.replace(CARD_NUMBER_REGEX, "[REDACTED_CARD]");
    // Redact Bearer tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, "Bearer [REDACTED_TOKEN]");
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  if (typeof data === "object") {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = redactSensitiveData(value);
      }
    }
    return clean;
  }

  return data;
}

export const logger = {
  info(message: string, context?: Record<string, any>): void {
    const clean = context ? redactSensitiveData(context) : undefined;
    console.log(`[INFO] ${message}`, clean ? JSON.stringify(clean) : "");
  },

  warn(message: string, context?: Record<string, any>): void {
    const clean = context ? redactSensitiveData(context) : undefined;
    console.warn(`[WARN] ${message}`, clean ? JSON.stringify(clean) : "");
  },

  error(message: string, error?: unknown, context?: Record<string, any>): void {
    const clean = context ? redactSensitiveData(context) : undefined;
    const errMessage = error instanceof Error ? error.message : String(error || "");
    console.error(`[ERROR] ${message} - ${errMessage}`, clean ? JSON.stringify(clean) : "");
  },

  security(event: string, context: Record<string, any>): void {
    const clean = redactSensitiveData({
      timestamp: new Date().toISOString(),
      securityEvent: event,
      ...context,
    });
    console.warn(`[SECURITY_ALERT] ${event}:`, JSON.stringify(clean));
  },
};
