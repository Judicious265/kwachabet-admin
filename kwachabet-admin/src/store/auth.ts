import { create } from 'zustand';
import axios from 'axios';

interface AuthState {
  user: { id: string; name: string; phone: string; role: string; is_admin: boolean } | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Recover token and user on page reload if in browser
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;

  if (savedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
  }

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken,
    isAuthenticated: !!savedToken,

    login: async (phone, password) => {
      // 1. Send phone and password to the database API
      const response = await axios.post('/api/auth/login', { phone, password });
      const { token, user } = response.data;

      // 2. Save session locally
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
      
      // 3. Attach token to all outgoing API requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      set({
        user,
        token,
        isAuthenticated: true,
      });
    },

    logout: () => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      delete axios.defaults.headers.common['Authorization'];
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
