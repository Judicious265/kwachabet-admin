import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface User {
  id: string;
  phone: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: (user, token) => {
        // Save token in both cookie and localStorage for resilience
        Cookies.set('kb_admin_token', token, {
          expires: 1,
          secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
          sameSite: 'strict',
        });
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        Cookies.remove('kb_admin_token');
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') window.location.href = '/login';
      },
    }),
    {
      name: 'kb-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          // Re-sync cookie from localStorage token on page load
          if (state.token) {
            Cookies.set('kb_admin_token', state.token, {
              expires: 1,
              secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
              sameSite: 'strict',
            });
          }
        }
      },
    }
  )
);
