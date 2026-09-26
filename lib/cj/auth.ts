import { CJApiResponse, CJAccessTokenData } from "./types";

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  openId?: string;
}

let memoryTokenCache: CachedToken | null = null;

export class CJAuthManager {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.CJ_API_BASE_URL || "https://developers.cjdropshipping.com/api2.0";
  }

  /**
   * Returns a valid CJ Access Token. Refreshes automatically if close to expiration.
   */
  async getValidToken(): Promise<string> {
    const now = Date.now();
    const expiryBufferMs = 10 * 60 * 1000; // 10 minutes buffer

    if (memoryTokenCache && memoryTokenCache.expiresAt - now > expiryBufferMs) {
      return memoryTokenCache.accessToken;
    }

    // Check if static access token was provided in environment
    if (process.env.CJ_ACCESS_TOKEN && !process.env.CJ_API_KEY) {
      return process.env.CJ_ACCESS_TOKEN;
    }

    // Acquire new token via API Key
    return await this.fetchNewAccessToken();
  }

  /**
   * Authenticates with CJ API v2.0 using the merchant's API Key.
   */
  async fetchNewAccessToken(): Promise<string> {
    const apiKey = process.env.CJ_API_KEY;
    if (!apiKey) {
      throw new Error("CJ_API_KEY is not configured in environment variables.");
    }

    const response = await fetch(`${this.baseUrl}/v1/authentication/getAccessToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      throw new Error(`CJ Authentication HTTP error: ${response.status} ${response.statusText}`);
    }

    const payload: CJApiResponse<CJAccessTokenData> = await response.json();

    if (payload.code !== 200 || !payload.result || !payload.data?.accessToken) {
      throw new Error(`CJ Authentication failure: ${payload.message || "Unknown error"}`);
    }

    const expiresAt = payload.data.accessTokenExpiryDate
      ? new Date(payload.data.accessTokenExpiryDate).getTime()
      : Date.now() + 24 * 60 * 60 * 1000;

    memoryTokenCache = {
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
      expiresAt,
      openId: payload.data.openId,
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
    expiresInMinutes: number | null;
  } {
    const configured = Boolean(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN);
    if (!memoryTokenCache) {
      return { configured, hasCachedToken: false, expiresInMinutes: null };
    }

    const remainingMs = memoryTokenCache.expiresAt - Date.now();
    return {
      configured,
      hasCachedToken: true,
      expiresInMinutes: Math.max(0, Math.floor(remainingMs / (60 * 1000))),
    };
  }
}

export const cjAuthManager = new CJAuthManager();
