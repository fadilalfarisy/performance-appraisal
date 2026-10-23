import type { Request, Response } from 'express';

export const REFRESH_TOKEN_COOKIE = 'appraisal_refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV != 'development',
  sameSite: 'lax' as const,
  path: REFRESH_TOKEN_COOKIE_PATH,
};

export function readRefreshTokenCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    if (name !== REFRESH_TOKEN_COOKIE) continue;

    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, refreshTokenCookieOptions);
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshTokenCookieOptions);
}
