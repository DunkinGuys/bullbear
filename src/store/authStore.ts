import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/types';

interface AuthStore {
  agent: Agent | null;
  apiKey: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  setAuth: (agent: Agent, apiKey: string) => void;
  clearAuth: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      agent: null,
      apiKey: null,
      isAuthenticated: false,
      isRestoring: false,
      setAuth: (agent, apiKey) => set({ agent, apiKey, isAuthenticated: true }),
      clearAuth: () => set({ agent: null, apiKey: null, isAuthenticated: false }),
      refresh: async () => {
        const { apiKey } = get();
        if (!apiKey) return;
        set({ isRestoring: true });
        try {
          const res = await fetch('/api/agents', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (!res.ok) {
            set({ agent: null, apiKey: null, isAuthenticated: false, isRestoring: false });
            return;
          }
          const agent: Agent = await res.json();
          set({ agent, isAuthenticated: true, isRestoring: false });
        } catch {
          set({ isRestoring: false });
        }
      },
    }),
    {
      name: 'bullbear-auth',
      partialize: (state) => ({ apiKey: state.apiKey }),
    }
  )
);
