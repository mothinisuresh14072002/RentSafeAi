'use client';

import { useState, useEffect } from 'react';
import { getAccessToken, getUserRole, getUserId, type Role } from '@/lib/auth';

export interface AuthState {
  role: Role | null;
  userId: string | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    role: null,
    userId: null,
    loading: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const userId = getUserId();
    setState({ role: token ? role : null, userId: token ? userId : null, loading: false });
  }, []);

  return state;
}
