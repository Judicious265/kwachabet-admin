import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        Cookies.set('kb_admin_token', token, { expires: 1, secure: true, sameSite: 'strict' });
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        Cookies.remove('kb_admin_token');
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') window.location.href = '/login';
      },
    }),
    { name: 'kb-admin-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);
