/**
 * Enhanced API client with:
 * - Typed methods (get, post, patch, put, delete)
 * - X-Audit-Reason header injection
 * - Idempotency-Key header injection
 * - Silent token refresh on 401 (one retry)
 * - Structured ApiError
 */

import { getAccessToken, getRefreshToken, storeTokens, clearTokens, getUserRole } from './auth';

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001/api/v1`;
  }
  return 'http://localhost:3001/api/v1';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  auditReason?: string;
  idempotencyKey?: string;
  skipAuthRefresh?: boolean;
  body?: unknown;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/otp/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const role = getUserRole();
    if (data.accessToken && data.refreshToken && role) {
      storeTokens(data.accessToken, data.refreshToken, role);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }
  isRefreshing = true;
  const token = await doRefresh();
  isRefreshing = false;
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
  return token;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { auditReason, idempotencyKey, skipAuthRefresh, body, ...init } = options;

  const headers = new Headers(init.headers as HeadersInit);
  headers.set('Content-Type', 'application/json');

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (auditReason) headers.set('X-Audit-Reason', auditReason);
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuthRefresh && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
    clearTokens();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message) ? err.message.join(', ') : (err.message || message);
      code = err.error || String(res.status);
    } catch {
      // ignore
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'POST', body });
  },
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'PATCH', body });
  },
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'PUT', body });
  },
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
