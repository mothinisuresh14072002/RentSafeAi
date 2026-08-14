/**
 * A lightweight fetch wrapper mapping to the local NestJS API.
 * Automatically injects auth tokens if available in localStorage.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('access_token');
  }

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const errData = await response.json();
      message = errData.message || message;
    } catch (e) {
      // Ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  
  return response.json();
}
