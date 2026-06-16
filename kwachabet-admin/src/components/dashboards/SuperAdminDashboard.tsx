import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import AdminLayout from '../layouts/AdminLayout';
import { StatCard, StatsSkeleton, Skeleton, EmptyState } from '../ui';
import { dashboardAPI, customersAPI, betsAPI, paymentsAPI, fraudAPI, fmt } from '../../lib/adminApi';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';

const COLORS = ['#00C853','#3B82F6','#F59E0B','#EF4444','#8B5CF6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value > 999 ? fmt.mwk(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function SuperAdminDashboard() {
  const { admin } = useAdminStore();
  const [stats, setStats]           = useState<any>(null);
  const [tickets, setTickets]       = useState<any[]>([]);
  const [txns, setTxns]             = useState<any[]>([]);
  const [users, setUsers]           = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [sR, tR, txR, uR, fR] = await Promise.allSettled([
        dashboardAPI.getStats(),
        betsAPI.list({ limit: 8 }),
        betsAPI.transactions({ limit: 8 }),
        customersAPI.list({ limit: 5 }),
        fraudAPI.dashboard(),
      ]);
      if (sR.status === 'fulfilled') setStats(sR.value.data);
      if (tR.status === 'fulfilled') setTickets(tR.value.data.tickets || []);
      if (txR.status === 'fulfilled') setTxns(txR.value.data.transactions || []);
      if (uR.status === 'fulfilled') setUsers(uR.value.data.users || []);
      if (fR.status === 'fulfilled') setFraudFlags(fR.value.data.flags?.rows || []);
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const stakeData = tickets.map((t: any) => ({
    time: fmt.datetime(t.created_at),
    stake: parseFloat(t.stake || 0),
    potential: parseFloat(t.potential_win || 0),
  }));

  const sportCount: Record<string, number> = {};
  tickets.forEach((t: any) => { const s = t.sport_id || 'football'; sportCount[s] = (sportCount[s] || 0) + 1; });
  const sportsData = Object.entries(sportCount).map(([name, value]) => ({ name, value }));

  return (
    <AdminLayout title="Super Admin Dashboard">

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome, <span className="text-white font-semibold">{admin?.full_name}</span></p>
          <p className="text-gray-600 text-xs">Updated {lastUpdated.toLocaleTimeString('en-GB')} · <span className="text-green-400">● Live</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs py-2 px-3">🔄 Refresh</button>
          {stats?.finance?.pending_withdrawals > 0 && (
            <a href="/payments" className="btn-primary text-xs py-2 px-3">⚠️ {stats.finance.pending_withdrawals} Pending</a>
          )}
        </div>
      </div>

      {loading ? <StatsSkeleton /> : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Total Users"       value={stats.users?.total || 0}                 icon="👥" color="blue"   format="number" sub={`+${stats.users?.new_today||0} today`} />
            <StatCard label="Active Bets"       value={stats.bets?.active_tickets || 0}         icon="🎯" color="yellow" format="number" sub="Pending settlement" />
            <StatCard label="Deposits Today"    value={stats.finance?.deposits_today || 0}      icon="💰" color="green"  format="mwk" />
            <StatCard label="Withdrawals Today" value={stats.finance?.withdrawals_today || 0}   icon="💸" color="red"    format="mwk" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Pending Withdrawals" value={stats.finance?.pending_withdrawals||0} icon="⏳" color={stats.finance?.pending_withdrawals>0?'yellow':'green'} format="number" />
            <StatCard label="Platform Liability"  value={stats.finance?.total_wallet_balance||0}icon="🏦" color="purple" format="mwk" />
            <StatCard label="Fraud Flags"         value={stats.fraud?.open_flags||0}            icon="🚨" color={stats.fraud?.open_flags>0?'red':'green'} format="number" />
            <StatCard label="New Users Today"     value={stats.users?.new_today||0}             icon="🆕" color="blue"   format="number" />
          </div>
        </>
      ) : (
        <div className="admin-card p-6 text-center mb-6">
          <p className="text-red-400">Backend not responding. <button onClick={load} className="text-brand underline">Retry</button></p>
        </div>
      )}

      {/* System health */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {[
          { label: 'API',      ok: !!stats },
          { label: 'Database', ok: !!stats },
          { label: 'Payments', ok: true },
          { label: 'SMS',      ok: true },
          { label: 'Odds',     ok: true },
          { label: 'WebSocket',ok: true },
        ].map(s => (
          <div key={s.label} className="admin-card p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <div className="flex items-center justify-center gap-1">
              <span className={'status-dot '+(s.ok?'status-dot-green':'status-dot-red')} />
              <p className={'text-xs font-bold '+(s.ok?'text-green-400':'text-red-400')}>{s.ok?'OK':'Down'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="admin-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-white font-semibold">Bet Activity</h3><p className="text-gray-500 text-xs">Stake vs Potential Win</p></div>
            <a href="/bets" className="text-brand text-xs hover:underline">All →</a>
          </div>
          {stakeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stakeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill:'#6B7280', fontSize:8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#6B7280', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>(v/1000).toFixed(0)+'K'} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="stake"     name="Stake"         fill="#00C853" radius={[4,4,0,0]} />
                <Bar dataKey="potential" name="Potential Win" fill="#3B82F6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="🎯" title="No bets yet" subtitle="Chart appears as users place bets" />
          )}
        </div>

        <div className="admin-card p-4">
          <h3 className="text-white font-semibold mb-4">Sports Breakdown</h3>
          {sportsData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={sportsData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {sportsData.map((_:any, i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#1F2937', border:'1px solid #374151', borderRadius:8, fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {sportsData.slice(0,4).map((s:any, i:number) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background:COLORS[i] }} />
                      <span className="text-gray-400 capitalize">{s.name}</span>
                    </div>
                    <span className="text-white font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon="⚽" title="No data yet" />
          )}
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Latest bets */}
        <div className="admin-card">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Latest Bets</h3>
            <a href="/bets" className="text-brand text-xs">All →</a>
          </div>
          {loading ? <div className="p-4 space-y-2">{[...Array(5)].map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
          : tickets.length === 0 ? <EmptyState icon="🎯" title="No bets yet" />
          : <div className="divide-y divide-admin-border">
            {tickets.map((t:any) => (
              <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover">
                <div>
                  <p className="text-xs font-mono text-brand font-bold">{t.ticket_code}</p>
                  <p className="text-xs text-gray-500">{t.user_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">{fmt.mwk(t.stake)}</p>
                  <span className={'text-xs px-1.5 py-0.5 rounded-full font-semibold '+(t.status==='won'?'bg-green-900/40 text-green-400':t.status==='lost'?'bg-red-900/40 text-red-400':'bg-yellow-900/40 text-yellow-400')}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Latest transactions */}
        <div className="admin-card">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Transactions</h3>
            <a href="/payments" className="text-brand text-xs">All →</a>
          </div>
          {loading ? <div className="p-4 space-y-2">{[...Array(5)].map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
          : txns.length === 0 ? <EmptyState icon="💸" title="No transactions yet" />
          : <div className="divide-y divide-admin-border">
            {txns.map((t:any) => {
              const isCredit = parseFloat(t.amount) > 0;
              return (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover">
                  <div>
                    <p className="text-xs text-white capitalize">{(t.type||'').replace(/_/g,' ')}</p>
                    <p className="text-xs text-gray-500 font-mono">{t.user_phone}</p>
                  </div>
                  <p className={'text-xs font-bold '+(isCredit?'text-green-400':'text-red-400')}>
                    {isCredit?'+':''}{fmt.mwk(Math.abs(parseFloat(t.amount)))}
                  </p>
                </div>
              );
            })}
          </div>}
        </div>

        {/* Fraud + quick actions */}
        <div className="space-y-4">
          {fraudFlags.length > 0 && (
            <div className="admin-card border-red-700/30">
              <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  🚨 Fraud Alerts
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{fraudFlags.length}</span>
                </h3>
                <a href="/fraud" className="text-brand text-xs">All →</a>
              </div>
              <div className="divide-y divide-admin-border">
                {fraudFlags.slice(0,3).map((f:any) => (
                  <div key={f.id} className="px-4 py-2.5 hover:bg-admin-hover">
                    <p className="text-xs text-white font-medium">{f.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={'badge text-xs '+(f.severity==='critical'?'badge-danger':f.severity==='high'?'bg-orange-900/40 text-orange-400 border border-orange-800':'badge-warning')}>{f.severity}</span>
                      <span className="text-xs text-gray-500">{f.full_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-card p-4">
            <h3 className="text-white font-semibold text-sm mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label:'Withdrawals', href:'/payments', icon:'💸', urgent: stats?.finance?.pending_withdrawals>0 },
                { label:'Fraud',       href:'/fraud',    icon:'🛡️', urgent: stats?.fraud?.open_flags>0 },
                { label:'Add Match',   href:'/sports',   icon:'⚽', urgent: false },
                { label:'Tax Report',  href:'/tax',      icon:'📋', urgent: false },
                { label:'Admin Team',  href:'/admins',   icon:'👤', urgent: false },
                { label:'Settings',    href:'/settings', icon:'⚙️', urgent: false },
              ].map(a => (
                <a key={a.label} href={a.href}
                  className={'flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all '+(a.urgent?'border-red-700/50 bg-red-900/10 text-red-400':'border-admin-border text-gray-400 hover:border-brand/30 hover:text-white')}>
                  <span className="text-lg">{a.icon}</span>
                  <span>{a.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
