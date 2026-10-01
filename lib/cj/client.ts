import { cjAuthManager } from "./auth";
import { CJApiResponse } from "./types";
import { CJApiError, CJAuthError, CJRateLimitError } from "./errors";

export interface CJRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  maxRetries?: number;
  timeoutMs?: number;
}

export class CJHttpClient {
  private baseUrl: string;
  private lastRequestTime = 0;
  private minIntervalMs = 150; // Rate limit protection: enforce 150ms spacing

  constructor() {
    this.baseUrl = process.env.CJ_API_BASE_URL || "https://developers.cjdropshipping.com/api2.0";
  }

  /**
   * Executes an authenticated request to CJ Dropshipping API with retries, timeout, and backoff.
   */
  async request<T>(endpoint: string, options: CJRequestOptions = {}): Promise<CJApiResponse<T>> {
    const { method = "GET", params, body, maxRetries = 3, timeoutMs = 15000 } = options;

    let urlString = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        urlString += `?${queryString}`;
      }
    }

    // Rate-limit throttle spacing
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();

    let attempt = 0;
    let delayMs = 500;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const token = await cjAuthManager.getValidToken();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "CJ-Access-Token": token,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(urlString, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle 401 Unauthorized: token may have been revoked or expired
        if (res.status === 401) {
          cjAuthManager.invalidateCache();
          if (attempt <= 2) {
            continue;
          }
          throw new CJAuthError("CJ API token rejected (401 Unauthorized)");
        }

        // Handle 429 Rate Limit
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("Retry-After")) || 3;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          throw new CJRateLimitError("CJ API Rate Limit exceeded", retryAfter);
        }

        // Retryable HTTP status codes
        const retryableStatuses = [500, 502, 503, 504];
        if (retryableStatuses.includes(res.status) && attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
          continue;
        }

        if (!res.ok) {
          throw new CJApiError({
            message: `CJ API HTTP error: ${res.status} ${res.statusText}`,
            httpStatus: res.status,
            isRetryable: CJApiError.isRetryableStatus(res.status),
          });
        }

        const data: CJApiResponse<T> = await res.json();

        // CJ application-level error codes
        if (data.code !== 200 && !data.result) {
          throw new CJApiError({
            message: data.message || "CJ API application-level error",
            code: data.code,
            requestId: data.requestId,
            isRetryable: [429, 500, 503].includes(data.code),
          });
        }

        return data;
      } catch (err: unknown) {
        if (err instanceof CJApiError && !err.isRetryable) {
          throw err;
        }

        if (attempt > maxRetries) {
          if (err instanceof CJApiError) throw err;
          const msg = err instanceof Error ? err.message : "Unknown CJ API communication error";
          throw new CJApiError({
            message: `CJ API request failed after ${maxRetries} retries: ${msg}`,
            isRetryable: false,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new CJApiError({
      message: "CJ API request exhausted all retry attempts.",
      isRetryable: false,
    });
  }
}

export const cjHttpClient = new CJHttpClient();
