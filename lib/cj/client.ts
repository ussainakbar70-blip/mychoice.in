import { cjAuthManager } from "./auth";
import { CJApiResponse } from "./types";

export interface CJRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  maxRetries?: number;
}

export class CJHttpClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CJ_API_BASE_URL || "https://developers.cjdropshipping.com/api2.0";
  }

  /**
   * Executes an authenticated request to CJ Dropshipping API with retries and exponential backoff.
   */
  async request<T>(endpoint: string, options: CJRequestOptions = {}): Promise<CJApiResponse<T>> {
    const { method = "GET", params, body, maxRetries = 3 } = options;

    let urlString = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        urlString += `?${queryString}`;
      }
    }

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

        const res = await fetch(urlString, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 401 Unauthorized: token may have been revoked or expired
        if (res.status === 401 && attempt <= 2) {
          cjAuthManager.invalidateCache();
          continue;
        }

        // Retryable HTTP status codes
        const retryableStatuses = [429, 500, 502, 503, 504];
        if (retryableStatuses.includes(res.status) && attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
          continue;
        }

        if (!res.ok) {
          throw new Error(`CJ API HTTP error: ${res.status} ${res.statusText}`);
        }

        const data: CJApiResponse<T> = await res.json();
        return data;
      } catch (err: unknown) {
        if (attempt > maxRetries) {
          const message = err instanceof Error ? err.message : "Unknown CJ API communication error";
          throw new Error(`CJ API request failed after ${maxRetries} retries: ${message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error("CJ API request exhausted all retry attempts.");
  }
}

export const cjHttpClient = new CJHttpClient();
