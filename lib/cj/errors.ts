/**
 * CJ Dropshipping API Error Taxonomy & Normalization
 * Encapsulates normalized error classifications, HTTP status, and retryability determination.
 */

export type CJErrorCategory =
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "OUT_OF_STOCK"
  | "SHIPPING_ERROR"
  | "ORDER_CREATION_ERROR"
  | "ORDER_CONFIRMATION_ERROR"
  | "PAYMENT_ERROR"
  | "TRACKING_ERROR"
  | "WEBHOOK_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_CJ_ERROR";

export interface NormalizedCJError {
  category: CJErrorCategory;
  message: string;
  cjCode?: number;
  httpStatus?: number;
  requestId?: string;
  isRetryable: boolean;
  localEntityId?: string;
  timestamp: string;
}

export class CJApiError extends Error {
  public readonly category: CJErrorCategory;
  public readonly code: number;
  public readonly httpStatus?: number;
  public readonly isRetryable: boolean;
  public readonly requestId?: string;
  public readonly localEntityId?: string;
  public readonly timestamp: string;

  constructor(options: {
    message: string;
    category?: CJErrorCategory;
    code?: number;
    httpStatus?: number;
    isRetryable?: boolean;
    requestId?: string;
    localEntityId?: string;
  }) {
    super(options.message);
    this.name = "CJApiError";
    this.category = options.category || "UNKNOWN_CJ_ERROR";
    this.code = options.code || 500;
    this.httpStatus = options.httpStatus;
    this.isRetryable = options.isRetryable ?? CJApiError.isRetryableStatus(options.httpStatus);
    this.requestId = options.requestId;
    this.localEntityId = options.localEntityId;
    this.timestamp = new Date().toISOString();

    Object.setPrototypeOf(this, CJApiError.prototype);
  }

  static isRetryableStatus(status?: number): boolean {
    if (!status) return false;
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  toNormalized(): NormalizedCJError {
    return {
      category: this.category,
      message: this.message,
      cjCode: this.code,
      httpStatus: this.httpStatus,
      requestId: this.requestId,
      isRetryable: this.isRetryable,
      localEntityId: this.localEntityId,
      timestamp: this.timestamp,
    };
  }
}

export class CJAuthError extends CJApiError {
  constructor(message: string = "CJ Authentication failed or token expired", requestId?: string) {
    super({
      message,
      category: "AUTHENTICATION_ERROR",
      code: 401,
      httpStatus: 401,
      isRetryable: false,
      requestId,
    });
    this.name = "CJAuthError";
    Object.setPrototypeOf(this, CJAuthError.prototype);
  }
}

export class CJRateLimitError extends CJApiError {
  public readonly retryAfterSeconds: number;

  constructor(message: string = "CJ API rate limit exceeded", retryAfterSeconds: number = 3) {
    super({
      message,
      category: "RATE_LIMITED",
      code: 429,
      httpStatus: 429,
      isRetryable: true,
    });
    this.name = "CJRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, CJRateLimitError.prototype);
  }
}

export class CJValidationError extends CJApiError {
  constructor(message: string, localEntityId?: string) {
    super({
      message,
      category: "VALIDATION_ERROR",
      code: 400,
      httpStatus: 400,
      isRetryable: false,
      localEntityId,
    });
    this.name = "CJValidationError";
    Object.setPrototypeOf(this, CJValidationError.prototype);
  }
}

/**
 * Normalizes any error caught during CJ communication into a structured, sanitized error object.
 */
export function normalizeCJError(err: unknown, localEntityId?: string): NormalizedCJError {
  if (err instanceof CJApiError) {
    return err.toNormalized();
  }

  if (err instanceof Error) {
    const isNetwork = err.message.toLowerCase().includes("fetch") || err.message.toLowerCase().includes("network");
    return {
      category: isNetwork ? "NETWORK_ERROR" : "UNKNOWN_CJ_ERROR",
      message: err.message.replace(/([a-zA-Z0-9_-]{20,})/g, "[REDACTED]"), // Sanitize potential tokens
      isRetryable: isNetwork,
      localEntityId,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    category: "UNKNOWN_CJ_ERROR",
    message: "An unknown CJ Dropshipping integration error occurred.",
    isRetryable: false,
    localEntityId,
    timestamp: new Date().toISOString(),
  };
}
