'use client';

import { useEffect } from 'react';
import { shouldRefreshAuth } from '@/lib/authRefresh';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { apiKey, agent, refresh } = useAuthStore();

  useEffect(() => {
    if (shouldRefreshAuth(apiKey, !!agent)) {
      refresh();
    }
  }, [apiKey, agent, refresh]);

  return <>{children}</>;
}
