import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  plan: 'free' | 'pro' | null;
  login: (args: { user: User; token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      plan: null,

      login: ({ user, token }) => {
        set({
          user,
          token,
          plan: (user as any).plan ?? null,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          plan: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist only what we need
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        plan: state.plan,
      }),
    }
  )
);

