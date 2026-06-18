import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAdminStore, ROLE_NAV } from '../../store/adminStore';
import { fmt, ROLE_COLORS } from '../../lib/api';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Dashboard' }: LayoutProps) {
  const router = useRouter();
  const { admin, isAuthenticated, logout, _hasHydrated, canAccess } = useAdminStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking]       = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated || !admin) { router.push('/login'); return; }
    // Check if this role can access this page
    if (!canAccess(router.pathname)) {
      router.push('/');
      return;
    }
    setChecking(false);
  }, [_hasHydrated, isAuthenticated, admin, router.pathname]);

  if (!_hasHydrated || checking) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center">
            <span className="text-black font-black text-xl">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-admin-border border-t-brand rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = ROLE_NAV[admin?.role || 'customer_support'] || [];
  const roleBadge = ROLE_COLORS[admin?.role || ''] || 'badge-gray';

  return (
    <div className="min-h-screen bg-admin-bg flex">

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-admin-surface border-r border-admin-border
        flex flex-col transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="p-4 border-b border-admin-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-sm">K</span>
            </div>
            <div>
              <p className="text-white font-black text-sm">KwachaBet</p>
              <p className="text-brand text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-2.5 border-b border-admin-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className={`badge ${roleBadge} text-xs`}>{admin?.role_label}</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Online
            </div>
          </div>
        </div>

        {/* Navigation — role-specific */}
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

        {/* User profile */}
        <div className="p-3 border-t border-admin-border flex-shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-9 h-9 bg-brand/20 border border-brand/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-brand text-xs font-black">{fmt.initials(admin?.full_name || 'A')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{admin?.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{admin?.phone}</p>
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">

        {/* Top bar */}
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
              {new Date().toLocaleString('en-GB', { timeZone: 'Africa/Blantyre', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </span>
            <span className={`badge ${roleBadge} text-xs hidden sm:flex`}>{admin?.role_label}</span>
            <div className="w-8 h-8 bg-brand/20 border border-brand/30 rounded-full flex items-center justify-center">
              <span className="text-brand text-xs font-black">{fmt.initials(admin?.full_name || 'A')}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}

  );
}
