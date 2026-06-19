import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, RiskBadge, SearchBar, TableSkeleton, EmptyState, Modal, StatCard } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const SEV_COLOR: Record<string, string> = {
  low:      'badge-info',
  medium:   'badge-warning',
  high:     'bg-orange-900/40 text-orange-400 border border-orange-800',
  critical: 'badge-danger',
};

export default function FraudPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [flags, setFlags] = useState<any[]>([]);
  const [highRisk, setHighRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'flags' | 'risk'>('flags');
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    load();
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    try {
      const r = await adminAPI.getFraudDashboard();
      setFlags(r.data.flags?.rows || []);
      setHighRisk(r.data.suspiciousUsers || []);
    } catch { toast.error('Failed to load fraud data'); }
    finally { setLoading(false); }
  }

  async function resolveFlag(id: string) {
    if (!notes.trim()) return toast.error('Please enter resolution notes');
    setActionLoading(true);
    try {
      await adminAPI.resolveFraudFlag(id, notes);
      toast.success('Flag resolved');
      setSelected(null);
      setNotes('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  }

  async function suspendUser(id: string, name: string) {
    const reason = prompt(`Suspend ${name}? Enter reason:`);
    if (!reason) return;
    try {
      await adminAPI.suspendUser(id, reason);
      toast.success('User suspended');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  const critical = flags.filter(f => f.severity === 'critical').length;
  const high = flags.filter(f => f.severity === 'high').length;
  const filteredFlags = flags.filter(f =>
    !search ||
    f.rule_code?.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.phone?.includes(search)
  );
  const filteredRisk = highRisk.filter(u =>
    !search ||
    u.phone?.includes(search) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head><title>Fraud & Risk — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Fraud Detection & Risk Engine">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Open Flags" value={flags.length} icon="🚨" color={flags.length > 0 ? 'red' : 'green'} format="number" sub="Unresolved alerts" />
          <StatCard label="Critical Alerts" value={critical} icon="🔴" color={critical > 0 ? 'red' : 'green'} format="number" sub="Immediate action needed" />
          <StatCard label="High Risk Alerts" value={high} icon="🟠" color={high > 0 ? 'yellow' : 'green'} format="number" sub="Review required" />
          <StatCard label="High Risk Users" value={highRisk.length} icon="👤" color={highRisk.length > 0 ? 'yellow' : 'green'} format="number" sub="Risk score ≥ 60" />
        </div>

        {/* Alert banner */}
        {critical > 0 && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mb-4 flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-red-400 font-bold text-sm">{critical} Critical Alert{critical > 1 ? 's' : ''} Require Immediate Attention</p>
              <p className="text-red-400/70 text-xs">Review and resolve these flags as soon as possible</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('flags')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'flags' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
            🚨 Fraud Flags ({flags.length})
          </button>
          <button onClick={() => setTab('risk')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'risk' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
            ⚠️ High Risk Users ({highRisk.length})
          </button>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by rule, name or phone..." />

        {/* Fraud Flags */}
        {tab === 'flags' && (
          <div className="space-y-3">
            {loading ? <TableSkeleton rows={5} cols={1} /> :
             filteredFlags.length === 0 ? (
               <div className="admin-card">
                 <EmptyState icon="🎉" title="No active fraud flags" subtitle="All fraud flags have been resolved" />
               </div>
             ) : (
               filteredFlags.map(flag => (
                 <div key={flag.id} className={`admin-card p-4 ${flag.severity === 'critical' ? 'border-red-700/50' : flag.severity === 'high' ? 'border-orange-700/30' : ''}`}>
                   <div className="flex items-start justify-between gap-4">
                     <div className="flex-1 space-y-2">
                       <div className="flex items-center gap-2 flex-wrap">
                         <span className={`badge ${SEV_COLOR[flag.severity] || 'badge-gray'}`}>
                           {flag.severity?.toUpperCase()}
                         </span>
                         <code className="text-xs text-gray-400 bg-admin-surface px-2 py-0.5 rounded font-mono">
                           {flag.rule_code}
                         </code>
                         {flag.severity === 'critical' && (
                           <span className="text-xs text-red-400 animate-pulse font-bold">⚡ URGENT</span>
                         )}
                       </div>
                       <p className="text-white text-sm font-medium">{flag.description}</p>
                       <div className="flex items-center gap-4 text-xs text-gray-500">
                         <span>👤 {flag.full_name} · {flag.phone}</span>
                         <RiskBadge score={flag.risk_score || 0} />
                         <span>🕐 {fmt.datetime(flag.created_at)}</span>
                       </div>
                     </div>
                     <div className="flex flex-col gap-2 flex-shrink-0">
                       <button onClick={() => setSelected(flag)}
                         className="text-xs border border-admin-border text-gray-300 px-3 py-1.5 rounded-lg hover:border-brand hover:text-brand transition-colors">
                         Resolve
                       </button>
                       <button onClick={() => suspendUser(flag.user_id, flag.full_name)}
                         className="text-xs border border-red-800 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors">
                         Suspend
                       </button>
                     </div>
                   </div>
                 </div>
               ))
             )}
          </div>
        )}

        {/* High Risk Users */}
        {tab === 'risk' && (
          <div className="admin-card overflow-hidden">
            {loading ? <TableSkeleton rows={5} cols={5} /> :
             filteredRisk.length === 0 ? (
               <EmptyState icon="✅" title="No high risk users" subtitle="All users have acceptable risk scores" />
             ) : (
               <div className="overflow-x-auto">
                 <table className="admin-table">
                   <thead>
                     <tr>
                       <th>Customer</th>
                       <th>Risk Score</th>
                       <th>Risk Level</th>
                       <th>Status</th>
                       <th>Joined</th>
                       <th>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {filteredRisk.map(u => (
                       <tr key={u.id}>
                         <td>
                           <p className="text-white text-sm font-medium">{u.full_name}</p>
                           <p className="text-gray-600 text-xs font-mono">{u.phone}</p>
                         </td>
                         <td>
                           <div className="flex items-center gap-2">
                             <div className="flex-1 bg-admin-border rounded-full h-1.5 max-w-16">
                               <div className={`h-1.5 rounded-full ${u.risk_score >= 70 ? 'bg-red-400' : u.risk_score >= 40 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                 style={{ width: `${u.risk_score}%` }} />
                             </div>
                             <span className={`text-xs font-bold ${u.risk_score >= 70 ? 'text-red-400' : u.risk_score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                               {u.risk_score}
                             </span>
                           </div>
                         </td>
                         <td><RiskBadge score={u.risk_score} /></td>
                         <td><Badge status={u.is_suspended ? 'suspended' : 'active'} /></td>
                         <td className="text-xs text-gray-500">{fmt.date(u.created_at)}</td>
                         <td>
                           {!u.is_suspended && (
                             <button onClick={() => suspendUser(u.id, u.full_name)}
                               className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                               Suspend
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        )}

        {/* Resolve flag modal */}
        <Modal open={!!selected} onClose={() => { setSelected(null); setNotes(''); }} title="Resolve Fraud Flag">
          {selected && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`badge ${SEV_COLOR[selected.severity]}`}>{selected.severity?.toUpperCase()}</span>
                  <code className="text-xs font-mono text-gray-400">{selected.rule_code}</code>
                </div>
                <p className="text-white text-sm">{selected.description}</p>
                <p className="text-gray-500 text-xs">User: {selected.full_name} · {selected.phone}</p>
                <p className="text-gray-600 text-xs">Flagged: {fmt.datetime(selected.created_at)}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Resolution notes *</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Describe your investigation findings and resolution action..."
                  rows={4} className="admin-input resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolveFlag(selected.id)} disabled={actionLoading}
                  className="btn-primary flex-1">
                  {actionLoading ? 'Resolving...' : '✓ Mark as Resolved'}
                </button>
                <button onClick={() => suspendUser(selected.user_id, selected.full_name)}
                  className="btn-danger flex-1">
                  ⛔ Suspend User
                </button>
              </div>
              <button onClick={() => { setSelected(null); setNotes(''); }} className="btn-secondary w-full">Cancel</button>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
