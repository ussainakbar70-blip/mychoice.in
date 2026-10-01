import { CJApiResponse, CJAccessTokenData } from "./types";
import { CJAuthError } from "./errors";

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  openId?: string;
}

let memoryTokenCache: CachedToken | null = null;
let refreshPromise: Promise<string> | null = null;

export class CJAuthManager {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CJ_API_BASE_URL || "https://developers.cjdropshipping.com/api2.0";
  }

  /**
   * Returns a valid CJ Access Token.
   * If expired or within buffer, uses a refresh lock to refresh once without concurrency storms.
   */
  async getValidToken(): Promise<string> {
    const now = Date.now();
    // 30-minute buffer before 180-day expiration
    const expiryBufferMs = 30 * 60 * 1000;

    if (memoryTokenCache && memoryTokenCache.expiresAt - now > expiryBufferMs) {
      return memoryTokenCache.accessToken;
    }

    // Static token provided via environment
    if (process.env.CJ_ACCESS_TOKEN && !process.env.CJ_API_KEY && !process.env.CJ_CLIENT_SECRET) {
      return process.env.CJ_ACCESS_TOKEN;
    }

    // If already refreshing, wait for existing promise (avoids refresh storm)
    if (refreshPromise) {
      return await refreshPromise;
    }

    // Acquire refresh lock
    refreshPromise = (async () => {
      try {
        // Try refresh token first if available
        if (memoryTokenCache?.refreshToken) {
          try {
            return await this.refreshAccessToken(memoryTokenCache.refreshToken);
          } catch (refreshErr) {
            console.warn("[CJ Auth] Refresh token expired or failed; falling back to re-authentication:", refreshErr);
          }
        }

        // Re-authenticate with API Key / credentials
        return await this.fetchNewAccessToken();
      } finally {
        refreshPromise = null;
      }
    })();

    return await refreshPromise;
  }

  /**
   * Authenticates with CJ API v2.0 using the merchant's API Key or credentials.
   * Endpoint: POST /v1/authentication/getAccessToken
   */
  async fetchNewAccessToken(): Promise<string> {
    const apiKey = process.env.CJ_API_KEY;
    const email = process.env.CJ_CLIENT_ID;
    const password = process.env.CJ_CLIENT_SECRET;

    if (!apiKey && (!email || !password)) {
      throw new CJAuthError("CJ credentials not configured in environment variables (CJ_API_KEY or CJ_CLIENT_ID/SECRET).");
    }

    const body = apiKey ? { apiKey } : { email, password };

    const response = await fetch(`${this.baseUrl}/v1/authentication/getAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new CJAuthError(`CJ Authentication HTTP error: ${response.status} ${response.statusText}`);
    }

    const payload: CJApiResponse<CJAccessTokenData> = await response.json();

    if (payload.code !== 200 || !payload.result || !payload.data?.accessToken) {
      throw new CJAuthError(`CJ Authentication rejected: ${payload.message || "Unknown error"}`, payload.requestId);
    }

    const expiresAt = payload.data.accessTokenExpiryDate
      ? new Date(payload.data.accessTokenExpiryDate).getTime()
      : Date.now() + 180 * 24 * 60 * 60 * 1000; // CJ API 2.0 defaults to 180 days

    memoryTokenCache = {
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken || "",
      expiresAt,
      openId: payload.data.openId || process.env.CJ_OPEN_ID,
    };

    return payload.data.accessToken;
  }

  /**
   * Refreshes an expired access token using the stored refresh token.
   * Endpoint: POST /v1/authentication/refreshAccessToken
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/authentication/refreshAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new CJAuthError(`CJ Token Refresh HTTP error: ${response.status}`);
    }

    const payload: CJApiResponse<CJAccessTokenData> = await response.json();

    if (payload.code !== 200 || !payload.result || !payload.data?.accessToken) {
      throw new CJAuthError(`CJ Token Refresh rejected: ${payload.message || "Invalid refresh token"}`);
    }

    const expiresAt = payload.data.accessTokenExpiryDate
      ? new Date(payload.data.accessTokenExpiryDate).getTime()
      : Date.now() + 180 * 24 * 60 * 60 * 1000;

    memoryTokenCache = {
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken || refreshToken,
      expiresAt,
      openId: payload.data.openId || memoryTokenCache?.openId || process.env.CJ_OPEN_ID,
    };

    return payload.data.accessToken;
  }

  /**
   * Invalidates cached token to force re-authentication on next request.
   */
  invalidateCache(): void {
    memoryTokenCache = null;
  }

  /**
   * Diagnostic check on token status (safe for admin display, never exposes secrets).
   */
  getTokenStatus(): {
    configured: boolean;
    hasCachedToken: boolean;
    status: "VALID" | "EXPIRING" | "EXPIRED" | "NOT_CONFIGURED";
    expiresInDays: number | null;
    expiresInMinutes: number | null;
    expiresAtDate: string | null;
  } {
    const configured = Boolean(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN || (process.env.CJ_CLIENT_ID && process.env.CJ_CLIENT_SECRET));

    if (!configured) {
      return {
        configured: false,
        hasCachedToken: false,
        status: "NOT_CONFIGURED",
        expiresInDays: null,
        expiresInMinutes: null,
        expiresAtDate: null,
      };
    }

    if (!memoryTokenCache) {
      return {
        configured: true,
        hasCachedToken: false,
        status: "NOT_CONFIGURED",
        expiresInDays: null,
        expiresInMinutes: null,
        expiresAtDate: null,
      };
    }

    const remainingMs = memoryTokenCache.expiresAt - Date.now();
    const days = Math.round(remainingMs / (1000 * 60 * 60 * 24));
    const minutes = Math.round(remainingMs / (1000 * 60));

    let status: "VALID" | "EXPIRING" | "EXPIRED" = "VALID";
    if (remainingMs <= 0) {
      status = "EXPIRED";
    } else if (days <= 7) {
      status = "EXPIRING";
    }

    return {
      configured: true,
      hasCachedToken: true,
      status,
      expiresInDays: Math.max(0, days),
      expiresInMinutes: Math.max(0, minutes),
      expiresAtDate: new Date(memoryTokenCache.expiresAt).toISOString().split("T")[0],
    };
  }

  /**
   * Retrieves the openId used as the HMAC-SHA256 signing secret for incoming webhooks.
   */
  getWebhookSecret(): string | undefined {
    return memoryTokenCache?.openId || process.env.CJ_OPEN_ID || process.env.CJ_WEBHOOK_SECRET;
  }
}

export const cjAuthManager = new CJAuthManager();
