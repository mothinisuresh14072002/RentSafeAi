import * as SecureStore from 'expo-secure-store';

// Set this to your local machine IP when testing on a physical device, e.g., 'http://192.168.1.100:3001'
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient(endpoint: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('access_token');

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
