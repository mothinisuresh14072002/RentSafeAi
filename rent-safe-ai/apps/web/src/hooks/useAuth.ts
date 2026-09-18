'use client';

import { useEffect, useState } from 'react';
import { getAccessToken, getUserRole, getUserId, type Role } from '@/lib/auth';

export interface AuthState {
  role: Role | null;
  userId: string | null;
  loading: boolean;
}

function readAuthState(): AuthState {
  const token = getAccessToken();
  return {
    role: token ? getUserRole() : null,
    userId: token ? getUserId() : null,
    loading: false,
  };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    role: null,
    userId: null,
    loading: true,
  }));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(readAuthState());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return state;
}
