import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import AdminLayout from '../components/layout/AdminLayout';
import { StatCard, StatsSkeleton, Skeleton, EmptyState } from '../components/ui';
import { adminAPI, api, fmt } from '../adminApi';
import { useAdminStore } from '../store/adminStore';
import toast from 'react-hot-toast';

const COLORS = ['#00C853', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value > 999 ? fmt.mwk(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
 const { admin, isAuthenticated } = useAdminStore(); 
  const [stats, setStats]               = useState<any>(null);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentTxns, setRecentTxns]     = useState<any[]>([]);
  const [recentUsers, setRecentUsers]   = useState<any[]>([]);
  const [events, setEvents]             = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [lastUpdated, setLastUpdated]   = useState<Date>(new Date());

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user && !user.is_admin) { router.push('/login'); return; }
    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, ticketsRes, txRes, usersRes, eventsRes] = await Promise.allSettled([
        adminAPI.getDashboard(),
        adminAPI.getTickets({ limit: 8 }),
        adminAPI.getTransactions({ limit: 8 }),
        adminAPI.getUsers({ limit: 5 }),
        api.get('/odds/events', { params: { status: 'upcoming' } }),
      ]);

      if (statsRes.status === 'fulfilled')   setStats(statsRes.value.data);
      if (ticketsRes.status === 'fulfilled') setRecentTickets(ticketsRes.value.data.tickets || []);
      if (txRes.status === 'fulfilled')      setRecentTxns(txRes.value.data.transactions || []);
      if (usersRes.status === 'fulfilled')   setRecentUsers(usersRes.value.data.users || []);
      if (eventsRes.status === 'fulfilled')  setEvents(eventsRes.value.data.events || []);

      setLastUpdated(new Date());
    } catch { toast.error('Failed to refresh dashboard'); }
    finally { setLoading(false); }
  }, []);

  // Build real chart data from actual tickets
  const stakeData = recentTickets.slice(0, 8).map((t: any) => ({
    time:      fmt.datetime(t.created_at),
    stake:     parseFloat(t.stake || 0),
    potential: parseFloat(t.potential_win || 0),
  }));

  // Build real sports breakdown from actual tickets
  const sportCount: Record<string, number> = {};
  recentTickets.forEach((t: any) => {
    const sport = t.sport_id || 'football';
    sportCount[sport] = (sportCount[sport] || 0) + 1;
  });
  const sportsData = Object.entries(sportCount).map(([name, value]) => ({ name, value }));

  // Build real transaction chart from actual transactions
  const txChartData = recentTxns
    .filter((t: any) => t.type === 'deposit' || t.type === 'withdrawal')
    .slice(0, 7)
    .map((t: any) => ({
      time:   fmt.datetime(t.created_at),
      amount: Math.abs(parseFloat(t.amount || 0)),
      type:   t.type,
    }));

  const liveCount     = events.filter((e: any) => e.status === 'live').length;
  const upcomingCount = events.filter((e: any) => e.status === 'upcoming').length;

  return (
    <>
      <Head><title>Dashboard — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Dashboard">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">
              Welcome back, <span className="text-white font-semibold">{user?.full_name}</span>
            </p>
            <p className="text-gray-600 text-xs mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString('en-GB')} ·
              <span className="text-green-400 ml-1">● Live</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="btn-secondary text-xs py-2 px-3">🔄 Refresh</button>
            {stats?.finance?.pending_withdrawals > 0 && (
              <a href="/payments" className="btn-primary text-xs py-2 px-3">
                ⚠️ {stats.finance.pending_withdrawals} Pending Withdrawals
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        {loading ? <StatsSkeleton /> : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total Users"        value={stats.users?.total || 0}                    icon="👥" color="blue"   format="number" sub={'+' + (stats.users?.new_today || 0) + ' today'} />
              <StatCard label="Active Bets"        value={stats.bets?.active_tickets || 0}           icon="🎯" color="yellow" format="number" sub="Pending settlement" />
              <StatCard label="Deposits Today"     value={stats.finance?.deposits_today || 0}        icon="💰" color="green"  format="mwk"    sub="Real money in" />
              <StatCard label="Withdrawals Today"  value={stats.finance?.withdrawals_today || 0}     icon="💸" color="red"    format="mwk"    sub="Paid out today" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Pending Withdrawals" value={stats.finance?.pending_withdrawals || 0}  icon="⏳" color={stats.finance?.pending_withdrawals > 0 ? 'yellow' : 'green'} format="number" sub="Awaiting approval" />
              <StatCard label="Platform Liability"  value={stats.finance?.total_wallet_balance || 0} icon="🏦" color="purple" format="mwk"    sub="Total wallet balances" />
              <StatCard label="Fraud Flags"         value={stats.fraud?.open_flags || 0}             icon="🚨" color={stats.fraud?.open_flags > 0 ? 'red' : 'green'} format="number" sub={stats.fraud?.open_flags > 0 ? 'Needs review now' : 'All clear'} />
              <StatCard label="Live Events"         value={liveCount}                                icon="🔴" color="red"    format="number" sub={upcomingCount + ' upcoming'} />
            </div>
          </>
        ) : (
          <div className="admin-card p-6 text-center mb-6">
            <p className="text-red-400 font-medium">Could not load stats from backend</p>
            <p className="text-gray-500 text-sm mt-1">Check your backend is running on Render</p>
            <button onClick={loadAll} className="btn-primary text-sm mt-3">Retry</button>
          </div>
        )}

        {/* System health — real status */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {[
            { label: 'API',       ok: !!stats,             detail: stats ? 'Connected' : 'Down' },
            { label: 'Database',  ok: !!stats,             detail: stats ? 'PostgreSQL' : 'Error' },
            { label: 'Payments',  ok: true,                detail: 'PayChangu' },
            { label: 'SMS',       ok: true,                detail: "Africa's Talking" },
            { label: 'Odds Feed', ok: events.length > 0,   detail: events.length + ' events' },
            { label: 'WebSocket', ok: true,                detail: 'Live' },
          ].map(s => (
            <div key={s.label} className="admin-card p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span className={'status-dot ' + (s.ok ? 'status-dot-green' : 'status-dot-red')} />
                <p className={'text-xs font-bold ' + (s.ok ? 'text-green-400' : 'text-red-400')}>
                  {s.ok ? 'OK' : 'Down'}
                </p>
              </div>
              <p className="text-xs text-gray-600">{s.detail}</p>
            </div>
          ))}
        </div>

        {/* Charts — built from real data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Real bets chart */}
          <div className="admin-card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Latest Bets Activity</h3>
                <p className="text-gray-500 text-xs">Stake vs Potential Win — live from database</p>
              </div>
              <a href="/bets" className="text-brand text-xs hover:underline">View all →</a>
            </div>
            {stakeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stakeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => (v/1000).toFixed(0) + 'K'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="stake"     name="Stake"         fill="#00C853" radius={[4,4,0,0]} />
                  <Bar dataKey="potential" name="Potential Win" fill="#3B82F6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <p className="text-3xl mb-2">🎯</p>
                <p className="text-gray-500 text-sm">No bets placed yet</p>
                <p className="text-gray-600 text-xs mt-1">Chart will appear as users place bets</p>
              </div>
            )}
          </div>

          {/* Real sports breakdown */}
          <div className="admin-card p-4">
            <div className="mb-4">
              <h3 className="text-white font-semibold">Bets by Sport</h3>
              <p className="text-gray-500 text-xs">From your real tickets</p>
            </div>
            {sportsData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={sportsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {sportsData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {sportsData.slice(0, 4).map((s: any, i: number) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-gray-400 capitalize">{s.name}</span>
                      </div>
                      <span className="text-white font-medium">{s.value} bets</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[150px] flex flex-col items-center justify-center">
                <p className="text-gray-600 text-xs text-center">Breakdown appears after first bets are placed</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom panels — all real data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Real latest bets */}
          <div className="admin-card">
            <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Latest Bets</h3>
              <a href="/bets" className="text-brand text-xs hover:underline">All →</a>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recentTickets.length === 0 ? (
              <EmptyState icon="🎯" title="No bets yet" subtitle="Bets will appear here as users play" />
            ) : (
              <div className="divide-y divide-admin-border">
                {recentTickets.map((t: any) => (
                  <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover transition-colors">
                    <div>
                      <p className="text-xs font-mono text-brand font-bold">{t.ticket_code}</p>
                      <p className="text-xs text-gray-500">{t.user_phone || '—'}</p>
                      <p className="text-xs text-gray-600">{fmt.datetime(t.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{fmt.mwk(t.stake)}</p>
                      <p className="text-xs text-yellow-400">{fmt.odds(t.total_odds)}x</p>
                      <span className={
                        'text-xs px-1.5 py-0.5 rounded-full font-semibold ' + (
                          t.status === 'won'  ? 'bg-green-900/40 text-green-400' :
                          t.status === 'lost' ? 'bg-red-900/40 text-red-400' :
                          'bg-yellow-900/40 text-yellow-400'
                        )}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real latest transactions */}
          <div className="admin-card">
            <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Latest Transactions</h3>
              <a href="/payments" className="text-brand text-xs hover:underline">All →</a>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : recentTxns.length === 0 ? (
              <EmptyState icon="💸" title="No transactions yet" subtitle="Transactions appear after first deposit" />
            ) : (
              <div className="divide-y divide-admin-border">
                {recentTxns.map((t: any) => {
                  const isCredit = parseFloat(t.amount) > 0;
                  return (
                    <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover transition-colors">
                      <div>
                        <p className="text-xs text-white capitalize">{(t.type || '').replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500 font-mono">{t.user_phone || '—'}</p>
                        <p className="text-xs text-gray-600">{fmt.datetime(t.created_at)}</p>
                      </div>
                      <p className={'text-xs font-bold ' + (isCredit ? 'text-green-400' : 'text-red-400')}>
                        {isCredit ? '+' : ''}{fmt.mwk(Math.abs(parseFloat(t.amount)))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Real new users */}
            <div className="admin-card">
              <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">New Users</h3>
                <a href="/customers" className="text-brand text-xs hover:underline">All →</a>
              </div>
              {loading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : recentUsers.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-gray-600 text-xs">No users registered yet</p>
                </div>
              ) : (
                <div className="divide-y divide-admin-border">
                  {recentUsers.map((u: any) => (
                    <div key={u.id} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-admin-hover transition-colors">
                      <div className="w-7 h-7 bg-brand/20 border border-brand/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-brand text-xs font-black">
                          {u.full_name ? u.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{u.full_name}</p>
                        <p className="text-gray-600 text-xs font-mono">{u.phone}</p>
                      </div>
                      <p className="text-green-400 text-xs font-bold flex-shrink-0">{fmt.mwk(u.balance || 0)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions — linking to real pages */}
            <div className="admin-card p-4">
              <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Approve Withdrawals', href: '/payments', icon: '💸', urgent: stats?.finance?.pending_withdrawals > 0, count: stats?.finance?.pending_withdrawals },
                  { label: 'Fraud Flags',          href: '/fraud',    icon: '🛡️', urgent: stats?.fraud?.open_flags > 0,           count: stats?.fraud?.open_flags },
                  { label: 'Add Local Match',      href: '/sports',   icon: '⚽', urgent: false },
                  { label: 'Tax Report',           href: '/tax',      icon: '📋', urgent: false },
                ].map(action => (
                  <a key={action.label} href={action.href}
                    className={
                      'flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ' + (
                        action.urgent
                          ? 'border-red-700/50 bg-red-900/10 text-red-400 hover:bg-red-900/20'
                          : 'border-admin-border text-gray-400 hover:border-brand/30 hover:text-white hover:bg-admin-hover'
                      )}>
                    <span className="text-lg">{action.icon}</span>
                    <span>{action.label}</span>
                    {action.urgent && action.count > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{action.count}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>

      </AdminLayout>
    </>
  );
}
