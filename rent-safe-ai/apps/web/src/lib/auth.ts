/**
 * Token storage helpers — all reads/writes go through these functions.
 * localStorage is only accessed on the client side.
 */

export type Role = 'TENANT' | 'OWNER' | 'REVIEWER' | 'ADMIN';

const ACCESS_TOKEN_KEY = 'rsa_access_token';
const REFRESH_TOKEN_KEY = 'rsa_refresh_token';
const USER_ROLE_KEY = 'rsa_user_role';
const USER_ID_KEY = 'rsa_user_id';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Decode the `sub` claim from a JWT without verifying signature */
function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function storeTokens(accessToken: string, refreshToken: string, role: Role): void {
  if (!isBrowser()) return;
  const userId = decodeJwtSub(accessToken);
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_ROLE_KEY, role);
  if (userId) localStorage.setItem(USER_ID_KEY, userId);
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUserRole(): Role | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(USER_ROLE_KEY) as Role | null;
}

export function getUserId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
