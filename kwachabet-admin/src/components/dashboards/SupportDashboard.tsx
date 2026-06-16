import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { StatCard, Skeleton, EmptyState } from '../ui';
import { dashboardAPI, customersAPI, paymentsAPI, betsAPI, fmt } from '../../lib/adminApi';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';

export default function SupportDashboard() {
  const { admin } = useAdminStore();
  const [stats, setStats]         = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pending, setPending]     = useState<any[]>([]);
  const [tickets, setTickets]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [sR, cR, pR, tR] = await Promise.allSettled([
        dashboardAPI.getStats(),
        customersAPI.list({ limit: 8 }),
        paymentsAPI.pending(),
        betsAPI.list({ limit: 6, status: 'pending' }),
      ]);
      if (sR.status === 'fulfilled') setStats(sR.value.data);
      if (cR.status === 'fulfilled') setCustomers(cR.value.data.users || []);
      if (pR.status === 'fulfilled') setPending(pR.value.data.withdrawals || []);
      if (tR.status === 'fulfilled') setTickets(tR.value.data.tickets || []);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  async function handleApprove(id: string) {
    setApproving(id);
    try {
      await paymentsAPI.approve(id);
      toast.success('Withdrawal approved');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setApproving(null); }
  }

  return (
    <AdminLayout title="Customer Support Dashboard">
      <div className="mb-6">
        <p className="text-gray-400 text-sm">Welcome, <span className="text-white font-semibold">{admin?.full_name}</span></p>
        <p className="text-brand text-xs font-medium mt-0.5">🔵 Customer Support</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Customers"   value={stats?.users?.total || 0}                  icon="👥" color="blue"   format="number" sub={`+${stats?.users?.new_today||0} today`} />
        <StatCard label="Pending Withdrawals" value={pending.length}                           icon="⏳" color={pending.length>0?'yellow':'green'} format="number" sub="Awaiting your approval" />
        <StatCard label="Open Tickets"      value={tickets.length}                             icon="🎯" color="yellow" format="number" sub="Pending bets" />
        <StatCard label="Deposits Today"    value={stats?.finance?.deposits_today || 0}        icon="💰" color="green"  format="mwk" />
      </div>

      {/* Pending withdrawals — most important for support */}
      <div className="admin-card mb-6">
        <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            💸 Pending Withdrawals
            {pending.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{pending.length}</span>}
          </h3>
          <a href="/payments" className="text-brand text-xs hover:underline">View all →</a>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : pending.length === 0 ? (
          <EmptyState icon="✅" title="All clear!" subtitle="No pending withdrawals at the moment" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Destination</th>
                  <th>Risk</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((w: any) => (
                  <tr key={w.id}>
                    <td>
                      <p className="text-white text-sm font-medium">{w.user_name}</p>
                      <p className="text-gray-600 text-xs font-mono">{w.user_phone}</p>
                    </td>
                    <td className="text-white font-bold">{fmt.mwk(w.amount)}</td>
                    <td><span className="badge badge-info capitalize">{w.payment_method}</span></td>
                    <td className="text-xs text-gray-400 font-mono">{w.destination}</td>
                    <td>
                      <span className={'text-xs font-bold '+(w.risk_score>=70?'text-red-400':w.risk_score>=40?'text-yellow-400':'text-green-400')}>
                        {w.risk_score||0}/100
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{fmt.timeAgo(w.created_at)}</td>
                    <td>
                      <button
                        onClick={() => handleApprove(w.id)}
                        disabled={approving === w.id}
                        className="btn-primary text-xs py-1.5 px-3">
                        {approving === w.id ? '...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent customers + pending bets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent customers */}
        <div className="admin-card">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Recent Customers</h3>
            <a href="/customers" className="text-brand text-xs hover:underline">Manage →</a>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : customers.length === 0 ? (
            <EmptyState icon="👥" title="No customers yet" />
          ) : (
            <div className="divide-y divide-admin-border">
              {customers.map((c: any) => (
                <div key={c.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand/20 border border-brand/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-brand text-xs font-black">{fmt.initials(c.full_name)}</span>
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{c.full_name}</p>
                      <p className="text-gray-600 text-xs font-mono">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-xs font-bold">{fmt.mwk(c.balance || 0)}</p>
                    {c.is_suspended && <span className="badge badge-danger text-xs">Suspended</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending bets */}
        <div className="admin-card">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Pending Bets</h3>
            <a href="/bets" className="text-brand text-xs hover:underline">All bets →</a>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : tickets.length === 0 ? (
            <EmptyState icon="🎯" title="No pending bets" />
          ) : (
            <div className="divide-y divide-admin-border">
              {tickets.map((t: any) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-admin-hover transition-colors">
                  <div>
                    <p className="text-xs font-mono text-brand font-bold">{t.ticket_code}</p>
                    <p className="text-xs text-gray-500">{t.user_phone} · {fmt.timeAgo(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-xs font-bold">{fmt.mwk(t.stake)}</p>
                    <p className="text-yellow-400 text-xs">{fmt.odds(t.total_odds)}x</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tawk.to live chat embed */}
      <div className="admin-card mt-6 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">💬 Live Chat Monitor</h3>
          <span className="badge badge-success">Active</span>
        </div>
        <p className="text-gray-500 text-xs mb-3">Monitor and respond to customer live chats via Tawk.to</p>
        <a
          href="https://dashboard.tawk.to"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          🔗 Open Tawk.to Dashboard
        </a>
      </div>
    </AdminLayout>
  );
}
