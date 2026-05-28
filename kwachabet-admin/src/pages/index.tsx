import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import AdminLayout from '../components/layout/AdminLayout';
import { StatCard, StatsSkeleton, EmptyState } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const COLORS = ['#00C853', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Demo chart data (replace with real API data when available)
const revenueData = [
  { day: 'Mon', deposits: 450000, withdrawals: 280000, profit: 170000 },
  { day: 'Tue', deposits: 620000, withdrawals: 310000, profit: 310000 },
  { day: 'Wed', deposits: 380000, withdrawals: 220000, profit: 160000 },
  { day: 'Thu', deposits: 710000, withdrawals: 400000, profit: 310000 },
  { day: 'Fri', deposits: 890000, withdrawals: 520000, profit: 370000 },
  { day: 'Sat', deposits: 1200000, withdrawals: 680000, profit: 520000 },
  { day: 'Sun', deposits: 950000, withdrawals: 490000, profit: 460000 },
];

const betsData = [
  { time: '06:00', bets: 12 }, { time: '08:00', bets: 28 },
  { time: '10:00', bets: 45 }, { time: '12:00', bets: 67 },
  { time: '14:00', bets: 89 }, { time: '16:00', bets: 134 },
  { time: '18:00', bets: 178 }, { time: '20:00', bets: 210 },
  { time: '22:00', bets: 156 }, { time: '00:00', bets: 89 },
];

const sportsData = [
  { name: 'Football', value: 58 },
  { name: 'Basketball', value: 18 },
  { name: 'Tennis', value: 12 },
  { name: 'Ice Hockey', value: 7 },
  { name: 'Baseball', value: 5 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.name.toLowerCase().includes('deposit') || p.name.toLowerCase().includes('profit') || p.name.toLowerCase().includes('withdrawal')
            ? fmt.mwk(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      router.push('/login');
      return;
    }
    loadStats();
    const interval = setInterval(loadStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  async function loadStats() {
    try {
      const r = await adminAPI.getDashboard();
      setStats(r.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Dashboard — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Dashboard">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-500 text-sm">
              Welcome back, <span className="text-white font-medium">{user?.full_name}</span>
            </p>
            <p className="text-gray-600 text-xs mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadStats} className="btn-secondary text-xs py-2 px-3">
              🔄 Refresh
            </button>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? <StatsSkeleton /> : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Total Users"
                value={stats.users?.total || 0}
                icon="👥"
                color="blue"
                sub={`+${stats.users?.new_today || 0} today`}
                format="number"
              />
              <StatCard
                label="Active Tickets"
                value={stats.bets?.active_tickets || 0}
                icon="🎯"
                color="yellow"
                sub="Pending settlement"
                format="number"
              />
              <StatCard
                label="Deposits Today"
                value={stats.finance?.deposits_today || 0}
                icon="💰"
                color="green"
                prefix="MWK"
                format="mwk"
                sub="Real money in"
              />
              <StatCard
                label="Withdrawals Today"
                value={stats.finance?.withdrawals_today || 0}
                icon="💸"
                color="red"
                prefix="MWK"
                format="mwk"
                sub="Paid out"
              />
              <StatCard
                label="Pending Withdrawals"
                value={stats.finance?.pending_withdrawals || 0}
                icon="⏳"
                color="yellow"
                sub="Awaiting approval"
                format="number"
              />
              <StatCard
                label="Total Wallet Balance"
                value={stats.finance?.total_wallet_balance || 0}
                icon="🏦"
                color="purple"
                prefix="MWK"
                format="mwk"
                sub="Platform liability"
              />
              <StatCard
                label="Open Fraud Flags"
                value={stats.fraud?.open_flags || 0}
                icon="🚨"
                color={stats.fraud?.open_flags > 0 ? 'red' : 'green'}
                sub={stats.fraud?.open_flags > 0 ? 'Needs review' : 'All clear'}
                format="number"
              />
              <StatCard
                label="New Users Today"
                value={stats.users?.new_today || 0}
                icon="🆕"
                color="blue"
                sub="Registered today"
                format="number"
              />
            </div>

            {/* System health */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
              {[
                { label: 'API Status',      status: 'Healthy',   color: 'text-green-400' },
                { label: 'Database',        status: 'Connected', color: 'text-green-400' },
                { label: 'Payments',        status: 'Online',    color: 'text-green-400' },
                { label: 'SMS Gateway',     status: 'Active',    color: 'text-green-400' },
                { label: 'Odds Feed',       status: 'Syncing',   color: 'text-yellow-400' },
                { label: 'WebSocket',       status: 'Live',      color: 'text-green-400' },
              ].map(item => (
                <div key={item.label} className="admin-card p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                  <p className={`text-xs font-bold ${item.color}`}>{item.status}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Revenue chart */}
          <div className="admin-card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">Revenue This Week</h3>
                <p className="text-gray-500 text-xs">Deposits vs Withdrawals vs Profit</p>
              </div>
              <span className="badge badge-success text-xs">Live</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="depositGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withdrawGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#00C853" fill="url(#depositGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#EF4444" fill="url(#withdrawGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#3B82F6" fill="url(#profitGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sports breakdown */}
          <div className="admin-card p-4">
            <div className="mb-4">
              <h3 className="text-white font-semibold">Bets by Sport</h3>
              <p className="text-gray-500 text-xs">Distribution this week</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sportsData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {sportsData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {sportsData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-gray-400">{s.name}</span>
                  </div>
                  <span className="text-white font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Betting activity chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="admin-card p-4">
            <div className="mb-4">
              <h3 className="text-white font-semibold">Betting Activity Today</h3>
              <p className="text-gray-500 text-xs">Bets placed per hour</p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={betsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bets" name="Bets" fill="#00C853" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick actions */}
          <div className="admin-card p-4">
            <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Review Withdrawals', icon: '💸', href: '/payments', urgent: (stats?.finance?.pending_withdrawals || 0) > 0 },
                { label: 'Fraud Alerts',       icon: '🛡️', href: '/fraud',    urgent: (stats?.fraud?.open_flags || 0) > 0 },
                { label: 'Manage Customers',   icon: '👥', href: '/customers', urgent: false },
                { label: 'View All Bets',      icon: '🎯', href: '/bets',     urgent: false },
                { label: 'Add Local Match',    icon: '⚽', href: '/sports',   urgent: false },
                { label: 'Tax Reports',        icon: '📋', href: '/tax',      urgent: false },
                { label: 'Export Reports',     icon: '📈', href: '/reports',  urgent: false },
                { label: 'System Settings',    icon: '⚙️', href: '/settings', urgent: false },
              ].map(action => (
                <a key={action.label} href={action.href}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer
                    ${action.urgent
                      ? 'border-red-700/50 bg-red-900/10 text-red-400 hover:bg-red-900/20'
                      : 'border-admin-border text-gray-400 hover:border-brand/30 hover:text-white hover:bg-admin-hover'
                    }`}
                >
                  <span className="text-base">{action.icon}</span>
                  <span>{action.label}</span>
                  {action.urgent && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="admin-card">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold">Recent Activity</h3>
            <a href="/bets" className="text-brand text-xs hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-admin-border">
            {[
              { type: 'bet', msg: 'New accumulator bet placed', user: '+26599XXXXXX', amount: 'MWK 2,500', time: '2 min ago', icon: '🎯', color: 'text-yellow-400' },
              { type: 'deposit', msg: 'Airtel Money deposit received', user: '+26588XXXXXX', amount: 'MWK 15,000', time: '5 min ago', icon: '💰', color: 'text-green-400' },
              { type: 'win', msg: 'Bet settled — Winner paid', user: '+26599XXXXXX', amount: 'MWK 8,750', time: '12 min ago', icon: '🏆', color: 'text-brand' },
              { type: 'withdrawal', msg: 'Withdrawal request pending', user: '+26588XXXXXX', amount: 'MWK 25,000', time: '18 min ago', icon: '💸', color: 'text-red-400' },
              { type: 'register', msg: 'New user registered', user: '+26599XXXXXX', amount: '', time: '24 min ago', icon: '🆕', color: 'text-blue-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-admin-hover transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm text-white">{item.msg}</p>
                    <p className="text-xs text-gray-500">{item.user}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.color}`}>{item.amount}</p>
                  <p className="text-xs text-gray-600">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </AdminLayout>
    </>
  );
}
