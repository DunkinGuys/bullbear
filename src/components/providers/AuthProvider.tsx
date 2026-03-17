'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { apiKey, agent, refresh } = useAuthStore();

  useEffect(() => {
    if (apiKey && !agent) {
      refresh();
    }
  }, [apiKey, agent, refresh]);

  return <>{children}</>;
}
