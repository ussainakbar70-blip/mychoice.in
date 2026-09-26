/**
 * CJ Dropshipping API Typed Errors
 * Encapsulates official API v2 error responses, HTTP status, and retryability determination.
 */

export class CJApiError extends Error {
  public readonly code: number;
  public readonly httpStatus?: number;
  public readonly isRetryable: boolean;
  public readonly originalData?: unknown;

  constructor(
    message: string,
    code: number = 500,
    httpStatus?: number,
    isRetryable: boolean = false,
    originalData?: unknown
  ) {
    super(message);
    this.name = "CJApiError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.isRetryable = isRetryable;
    this.originalData = originalData;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, CJApiError.prototype);
  }

  static isRetryableStatus(status?: number): boolean {
    if (!status) return false;
    // 429 Too Many Requests, 500 Internal, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
    return [429, 500, 502, 503, 504].includes(status);
  }
}

export class CJAuthError extends CJApiError {
  constructor(message: string = "CJ Authentication failed or token expired", originalData?: unknown) {
    super(message, 401, 401, false, originalData);
    this.name = "CJAuthError";
    Object.setPrototypeOf(this, CJAuthError.prototype);
  }
}

export class CJRateLimitError extends CJApiError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string = "CJ API rate limit exceeded", retryAfterSeconds?: number) {
    super(message, 429, 429, true);
    this.name = "CJRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, CJRateLimitError.prototype);
  }
}

export class CJValidationError extends CJApiError {
  public readonly validationErrors?: Record<string, string[]>;

  constructor(message: string, validationErrors?: Record<string, string[]>) {
    super(message, 400, 400, false, validationErrors);
    this.name = "CJValidationError";
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, CJValidationError.prototype);
  }
}
