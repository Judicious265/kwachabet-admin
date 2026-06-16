import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import { StatCard, Skeleton, EmptyState, Modal } from '../ui';
import { fraudAPI, customersAPI, betsAPI, fmt } from '../../lib/adminApi';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';

const SEV_COLOR: Record<string, string> = {
  low:      'badge-info',
  medium:   'badge-warning',
  high:     'bg-orange-900/40 text-orange-400 border border-orange-800',
  critical: 'badge-danger',
};

const SEV_ICON: Record<string, string> = {
  low: '🟡', medium: '🟠', high: '🔴', critical: '🚨',
};

export default function FraudDashboard() {
  const { admin } = useAdminStore();
  const [flags, setFlags]         = useState<any[]>([]);
  const [highRisk, setHighRisk]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [notes, setNotes]         = useState('');
  const [resolving, setResolving] = useState(false);
  const [noteAction, setNoteAction] = useState('investigate');
  const [newFlagModal, setNewFlagModal] = useState<any>(null);
  const [newFlag, setNewFlag]     = useState({ rule_code: '', severity: 'medium', description: '' });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const r = await fraudAPI.dashboard();
      setFlags(r.data.flags?.rows || []);
      setHighRisk(r.data.suspiciousUsers || []);
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load fraud data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  async function resolveFlag() {
    if (!selected || !notes.trim()) return toast.error('Resolution notes required');
    setResolving(true);
    try {
      await fraudAPI.resolve(selected.id, notes);
      // Also add investigation note
      await fraudAPI.addNote(selected.id, { note: notes, action_taken: noteAction });
      toast.success('Flag resolved and logged');
      setSelected(null);
      setNotes('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setResolving(false); }
  }

  async function suspendUser(userId: string, name: string) {
    const reason = window.prompt(`Suspend ${name}? Enter reason:`);
    if (!reason) return;
    try {
      await customersAPI.suspend(userId, reason);
      toast.success(`${name} suspended`);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function createFlag() {
    if (!newFlagModal || !newFlag.rule_code || !newFlag.description) {
      return toast.error('Rule code and description required');
    }
    try {
      await fraudAPI.createFlag(newFlagModal.id, newFlag);
      toast.success('Fraud flag created');
      setNewFlagModal(null);
      setNewFlag({ rule_code: '', severity: 'medium', description: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  const critical = flags.filter(f => f.severity === 'critical').length;
  const high     = flags.filter(f => f.severity === 'high').length;
  const open     = flags.filter(f => !f.resolved).length;

  return (
    <AdminLayout title="Fraud & Risk Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome, <span className="text-white font-semibold">{admin?.full_name}</span></p>
          <p className="text-orange-400 text-xs font-medium mt-0.5">🟠 Fraud Analyst · Updated {lastUpdated.toLocaleTimeString('en-GB')}</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs py-2 px-3">🔄 Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Open Flags"    value={open}          icon="🚨" color={open>0?'red':'green'}    format="number" sub="Unresolved alerts" />
        <StatCard label="Critical"      value={critical}      icon="🔴" color={critical>0?'red':'green'} format="number" sub="Immediate action" />
        <StatCard label="High Risk"     value={high}          icon="🟠" color={high>0?'yellow':'green'}  format="number" sub="Review required" />
        <StatCard label="Risky Users"   value={highRisk.length} icon="👤" color={highRisk.length>0?'yellow':'green'} format="number" sub="Score ≥ 60" />
      </div>

      {/* Critical alert banner */}
      {critical > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 mb-5 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-red-400 font-bold text-sm">{critical} CRITICAL Alert{critical > 1 ? 's' : ''} — Immediate Action Required</p>
            <p className="text-red-400/70 text-xs">Review and resolve these flags immediately</p>
          </div>
        </div>
      )}

      {/* Fraud flags list */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Active Fraud Flags</h3>
          <span className="text-xs text-gray-500">{open} open</span>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : flags.length === 0 ? (
          <div className="admin-card">
            <EmptyState icon="🎉" title="No active fraud flags" subtitle="All clear — no suspicious activity detected" />
          </div>
        ) : (
          flags.map(flag => (
            <div key={flag.id} className={`admin-card p-4 ${flag.severity==='critical'?'border-red-700/60':flag.severity==='high'?'border-orange-700/40':''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{SEV_ICON[flag.severity] || '⚠️'}</span>
                    <span className={`badge ${SEV_COLOR[flag.severity]||'badge-gray'}`}>{flag.severity?.toUpperCase()}</span>
                    <code className="text-xs text-gray-400 bg-admin-surface px-2 py-0.5 rounded font-mono">{flag.rule_code}</code>
                    {flag.severity === 'critical' && <span className="text-xs text-red-400 font-bold animate-pulse">⚡ URGENT</span>}
                  </div>
                  <p className="text-white text-sm font-medium">{flag.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>👤 {flag.full_name}</span>
                    <span className="font-mono">{flag.phone}</span>
                    <span className={`font-bold ${flag.risk_score>=70?'text-red-400':flag.risk_score>=40?'text-yellow-400':'text-green-400'}`}>
                      Risk: {flag.risk_score||0}/100
                    </span>
                    <span>🕐 {fmt.timeAgo(flag.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelected(flag)}
                    className="text-xs border border-brand/40 text-brand px-3 py-1.5 rounded-lg hover:bg-brand/10 transition-colors">
                    ✓ Resolve
                  </button>
                  <button
                    onClick={() => setNewFlagModal({ id: flag.user_id, name: flag.full_name })}
                    className="text-xs border border-orange-700/40 text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-900/20 transition-colors">
                    + Note
                  </button>
                  <button
                    onClick={() => suspendUser(flag.user_id, flag.full_name)}
                    className="text-xs border border-red-800 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors">
                    ⛔ Suspend
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* High risk users */}
      <div className="admin-card mb-6">
        <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">High Risk Users</h3>
          <a href="/customers" className="text-brand text-xs hover:underline">All customers →</a>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : highRisk.length === 0 ? (
          <EmptyState icon="✅" title="No high risk users" subtitle="All users have acceptable risk scores" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th>Customer</th><th>Risk Score</th><th>Status</th><th>Joined</th><th>Action</th></tr>
              </thead>
              <tbody>
                {highRisk.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <p className="text-white text-sm">{u.full_name}</p>
                      <p className="text-gray-600 text-xs font-mono">{u.phone}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-admin-border rounded-full h-1.5 max-w-[60px]">
                          <div className={`h-1.5 rounded-full ${u.risk_score>=70?'bg-red-400':u.risk_score>=40?'bg-yellow-400':'bg-green-400'}`}
                            style={{ width: `${u.risk_score}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${u.risk_score>=70?'text-red-400':u.risk_score>=40?'text-yellow-400':'text-green-400'}`}>
                          {u.risk_score}/100
                        </span>
                      </div>
                    </td>
                    <td><span className={`badge ${u.is_suspended?'badge-danger':'badge-success'}`}>{u.is_suspended?'Suspended':'Active'}</span></td>
                    <td className="text-xs text-gray-500">{fmt.date(u.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setNewFlagModal({ id: u.id, name: u.full_name })}
                          className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-900/20 transition-colors">
                          Flag
                        </button>
                        {!u.is_suspended && (
                          <button
                            onClick={() => suspendUser(u.id, u.full_name)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolve Flag Modal */}
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
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Action Taken</label>
              <select value={noteAction} onChange={e => setNoteAction(e.target.value)} className="admin-select w-full mb-3">
                <option value="investigate">Investigated — No action needed</option>
                <option value="warned">User warned</option>
                <option value="suspended">Account suspended</option>
                <option value="blocked">Account permanently blocked</option>
                <option value="cleared">False positive — Cleared</option>
              </select>
              <label className="block text-xs text-gray-400 mb-1.5">Investigation Notes *</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe your investigation findings..."
                rows={4}
                className="admin-input resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={resolveFlag} disabled={resolving} className="btn-primary flex-1 py-3">
                {resolving ? 'Resolving...' : '✓ Resolve & Log'}
              </button>
              <button onClick={() => suspendUser(selected.user_id, selected.full_name)} className="btn-danger flex-1 py-3">
                ⛔ Suspend User
              </button>
            </div>
            <button onClick={() => { setSelected(null); setNotes(''); }} className="btn-secondary w-full">Cancel</button>
          </div>
        )}
      </Modal>

      {/* Create Flag Modal */}
      <Modal open={!!newFlagModal} onClose={() => setNewFlagModal(null)} title={`Flag: ${newFlagModal?.name}`}>
        {newFlagModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Rule Code</label>
              <input value={newFlag.rule_code} onChange={e => setNewFlag(f => ({ ...f, rule_code: e.target.value }))}
                placeholder="e.g. MANUAL_REVIEW" className="admin-input font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Severity</label>
              <select value={newFlag.severity} onChange={e => setNewFlag(f => ({ ...f, severity: e.target.value }))}
                className="admin-select w-full">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Description *</label>
              <textarea value={newFlag.description} onChange={e => setNewFlag(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the suspicious activity..." rows={3} className="admin-input resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={createFlag} className="btn-primary flex-1 py-3">🚨 Create Flag</button>
              <button onClick={() => setNewFlagModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

    </AdminLayout>
  );
}
