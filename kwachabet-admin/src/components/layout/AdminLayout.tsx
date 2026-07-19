import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { fmt } from '../../lib/api';

const ROLE_NAV: Record<string, { href: string; label: string; icon: string; alert?: boolean }[]> = {
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

const ROLE_COLORS: Record<string, string> = {
  super_admin:      'badge-danger',
  customer_support: 'badge-info',
  fraud_analyst:    'bg-orange-900/40 text-orange-400 border border-orange-800',
  odds_manager:     'badge-success',
  finance_admin:    'badge-purple',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin:      'Super Admin',
  customer_support: 'Customer Support',
  fraud_analyst:    'Fraud Analyst',
  odds_manager:     'Odds Manager',
  finance_admin:    'Finance Admin',
};

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Dashboard' }: LayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated || !user) {
        router.push('/login');
      } else {
        setChecking(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  if (checking) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
            <span className="text-black font-black text-xl">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-admin-border border-t-brand rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const userRole  = (user as any)?.role || 'super_admin';
  const navItems  = ROLE_NAV[userRole] || ROLE_NAV['super_admin'];
  const roleBadge = ROLE_COLORS[userRole] || 'badge-gray';
  const roleLabel = ROLE_LABELS[userRole] || 'Admin';

  return (
    <div className="min-h-screen bg-admin-bg flex">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-admin-surface border-r border-admin-border
        flex flex-col transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-admin-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-sm">K</span>
            </div>
            <div>
              <p className="text-white font-black text-sm">KwachaBet</p>
              <p className="text-brand text-xs font-semibold">Admin Panel</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 border-b border-admin-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className={`badge ${roleBadge} text-xs`}>{roleLabel}</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-link ${active ? 'active' : ''}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.alert && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-admin-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-9 h-9 bg-brand/20 border border-brand/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand text-xs font-black">
                {fmt.initials(user?.full_name || 'A')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{(user as any)?.phone}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-2"
          >
            🚪 <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="h-14 bg-admin-surface border-b border-admin-border flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {new Date().toLocaleString('en-GB', {
                timeZone: 'Africa/Blantyre',
                hour: '2-digit', minute: '2-digit',
                day: '2-digit', month: 'short'
              })}
            </span>
            <span className={`badge ${roleBadge} text-xs hidden sm:flex`}>{roleLabel}</span>
            <div className="w-8 h-8 bg-brand/20 border border-brand/30 rounded-full flex items-center justify-center">
              <span className="text-brand text-xs font-black">
                {fmt.initials(user?.full_name || 'A')}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
