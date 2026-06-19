import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Permission {
  can_view:    boolean;
  can_create:  boolean;
  can_edit:    boolean;
  can_delete:  boolean;
  can_approve: boolean;
}

export interface Admin {
  id:          string;
  full_name:   string;
  phone:       string;
  role:        string;
  role_label:  string;
  role_color:  string;
  permissions: Record<string, Permission>;
}

interface AdminAuthStore {
  admin:           Admin | null;
  token:           string | null;
  isAuthenticated: boolean;
  _hasHydrated:    boolean;
  setHasHydrated:  (v: boolean) => void;
  login:           (admin: Admin, token: string) => void;
  logout:          () => void;
  hasPermission:   (resource: string, action?: keyof Permission) => boolean;
  canAccess:       (resource: string) => boolean;
}

// ── Pages each role can access ────────────────────────────────────────────────
export const ROLE_PAGES: Record<string, string[]> = {
  super_admin:      ['/', '/customers', '/bets', '/payments', '/fraud', '/sports', '/tax', '/reports', '/admins', '/settings'],
  customer_support: ['/', '/customers', '/bets', '/payments'],
  fraud_analyst:    ['/', '/fraud', '/customers', '/bets'],
  odds_manager:     ['/', '/sports', '/bets'],
  finance_admin:    ['/', '/payments', '/tax', '/reports'],
};

// ── Nav items per role ────────────────────────────────────────────────────────
export const ROLE_NAV: Record<string, { href: string; label: string; icon: string; alert?: boolean }[]> = {
  super_admin: [
    { href: '/',          label: 'Dashboard',    icon: '📊' },
    { href: '/customers', label: 'Customers',    icon: '👥' },
    { href: '/bets',      label: 'Bet Monitor',  icon: '🎯' },
    { href: '/payments',  label: 'Payments',     icon: '💸' },
    { href: '/fraud',     label: 'Fraud & Risk', icon: '🛡️', alert: true },
    { href: '/sports',    label: 'Sports & Odds',icon: '⚽' },
    { href: '/tax',       label: 'Tax Reports',  icon: '📋' },
    { href: '/reports',   label: 'Reports',      icon: '📈' },
    { href: '/admins',    label: 'Admin Team',   icon: '👤' },
    { href: '/settings',  label: 'Settings',     icon: '⚙️' },
  ],
  customer_support: [
    { href: '/',          label: 'Dashboard',    icon: '📊' },
    { href: '/customers', label: 'Customers',    icon: '👥' },
    { href: '/bets',      label: 'Tickets',      icon: '🎯' },
    { href: '/payments',  label: 'Withdrawals',  icon: '💸' },
  ],
  fraud_analyst: [
    { href: '/',          label: 'Dashboard',    icon: '📊' },
    { href: '/fraud',     label: 'Fraud Alerts', icon: '🚨', alert: true },
    { href: '/customers', label: 'Customers',    icon: '👥' },
    { href: '/bets',      label: 'Suspicious Bets', icon: '🎯' },
  ],
  odds_manager: [
    { href: '/',          label: 'Dashboard',    icon: '📊' },
    { href: '/sports',    label: 'Sports & Odds',icon: '⚽' },
    { href: '/bets',      label: 'Settlements',  icon: '🏁' },
  ],
  finance_admin: [
    { href: '/',          label: 'Dashboard',    icon: '📊' },
    { href: '/payments',  label: 'Payments',     icon: '💸' },
    { href: '/tax',       label: 'Tax Reports',  icon: '📋' },
    { href: '/reports',   label: 'Reports',      icon: '📈' },
  ],
};

// ── Zustand store ─────────────────────────────────────────────────────────────
export const useAdminStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      admin:           null,
      token:           null,
      isAuthenticated: false,
      _hasHydrated:    false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: (admin, token) => {
        Cookies.set('kb_admin_token', token, {
          expires: 0.33, // 8 hours
          secure:  typeof window !== 'undefined' && window.location.protocol === 'https:',
          sameSite:'strict',
        });
        set({ admin, token, isAuthenticated: true });
      },

      logout: () => {
        Cookies.remove('kb_admin_token');
        set({ admin: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') window.location.href = '/login';
      },

      hasPermission: (resource, action = 'can_view') => {
        const { admin } = get();
        if (!admin) return false;
        if (admin.role === 'super_admin') return true;
        const perm = admin.permissions?.[resource];
        return !!(perm && perm[action]);
      },

      canAccess: (path) => {
        const { admin } = get();
        if (!admin) return false;
        if (admin.role === 'super_admin') return true;
        const pages = ROLE_PAGES[admin.role] || [];
        return pages.includes(path);
      },
    }),
    {
      name:    'kb-admin-rbac',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ admin: s.admin, token: s.token, isAuthenticated: s.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          if (state.token) {
            Cookies.set('kb_admin_token', state.token, {
              expires: 0.33,
              secure:  typeof window !== 'undefined' && window.location.protocol === 'https:',
              sameSite:'strict',
            });
          }
        }
      },
    }
  )
);
