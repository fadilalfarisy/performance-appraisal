const REFRESH_TOKEN_KEY = "appraisal.refreshToken";

/**
 * The refresh token lives in sessionStorage; the access token stays in memory
 * (Redux) only. Every access is wrapped so a disabled/blocked storage never
 * throws.
 */
export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // ignore storage failures (private mode, quota, ...)
    }
  },

  clear(): void {
    this.setRefreshToken(null);
  },
};
