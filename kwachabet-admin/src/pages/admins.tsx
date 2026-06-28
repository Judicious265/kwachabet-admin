import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Modal, EmptyState, TableSkeleton, SearchBar } from '../components/ui';
import { api, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const ROLES = [
  { name: 'customer_support', label: 'Customer Support', desc: 'Customer management and withdrawals' },
  { name: 'fraud_analyst',    label: 'Fraud Analyst',    desc: 'Fraud detection and risk monitoring' },
  { name: 'odds_manager',     label: 'Odds Manager',     desc: 'Sports, odds and match settlement' },
  { name: 'finance_admin',    label: 'Finance Admin',    desc: 'Payments, revenue and tax reports' },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin:      'badge-danger',
  customer_support: 'badge-info',
  fraud_analyst:    'bg-orange-900/40 text-orange-400 border border-orange-800',
  odds_manager:     'badge-success',
  finance_admin:    'badge-purple',
};

const ACTION_ICONS: Record<string, string> = {
  login: '🔐', suspend_admin: '⛔', activate_admin: '✅',
  create_admin: '➕', delete_admin: '🗑️', update_admin: '✏️',
  suspend_user: '🚫', approve_withdrawal: '💸', reject_withdrawal: '❌',
  update_odds: '📊', set_result: '🏁', resolve_fraud: '🛡️',
};

export default function AdminsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [admins, setAdmins]   = useState<any[]>([]);
  const [roles, setRoles]     = useState<any[]>([]);
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'team'|'logs'>('team');
  const [saving, setSaving]   = useState(false);

  const [showAddModal, setShowAddModal]         = useState(false);
  const [showEditModal, setShowEditModal]       = useState<any>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal]   = useState<any>(null);
  const [suspendReason, setSuspendReason]       = useState('');

  const [addForm, setAddForm] = useState({ full_name: '', phone: '+265', email: '', password: '', role_name: 'customer_support' });
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role_name: '', new_password: '' });

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    loadAll();
  }, [isAuthenticated]);

  async function loadAll() {
    setLoading(true);
    try {
      const [adminsRes, rolesRes, logsRes] = await Promise.allSettled([
        api.get('/admin-team'),
        api.get('/admin-team/roles'),
        api.get('/admin-team/activity-logs', { params: { limit: 50 } }),
      ]);
      if (adminsRes.status === 'fulfilled') setAdmins(adminsRes.value.data.admins || []);
      if (rolesRes.status === 'fulfilled')  setRoles(rolesRes.value.data.roles || []);
      if (logsRes.status === 'fulfilled')   setLogs(logsRes.value.data.logs || []);
    } catch { toast.error('Failed to load admin team'); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!addForm.full_name || !addForm.phone || !addForm.password) return toast.error('All fields required');
    if (addForm.password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post('/admin-team', addForm);
      toast.success(`Admin created for ${addForm.full_name}`);
      setShowAddModal(false);
      setAddForm({ full_name: '', phone: '+265', email: '', password: '', role_name: 'customer_support' });
      loadAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!showEditModal) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (editForm.full_name)    payload.full_name    = editForm.full_name;
      if (editForm.email)        payload.email        = editForm.email;
      if (editForm.role_name)    payload.role_name    = editForm.role_name;
      if (editForm.new_password) payload.new_password = editForm.new_password;
      await api.patch(`/admin-team/${showEditModal.id}`, payload);
      toast.success('Admin updated');
      setShowEditModal(null);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleSuspend() {
    if (!showSuspendModal || !suspendReason) return toast.error('Reason required');
    setSaving(true);
    try {
      await api.patch(`/admin-team/${showSuspendModal.id}/suspend`, { reason: suspendReason });
      toast.success(`${showSuspendModal.full_name} suspended`);
      setShowSuspendModal(null);
      setSuspendReason('');
      loadAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleActivate(admin: any) {
    try {
      await api.patch(`/admin-team/${admin.id}/activate`);
      toast.success(`${admin.full_name} reactivated`);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete() {
    if (!showDeleteModal) return;
    setSaving(true);
    try {
      await api.delete(`/admin-team/${showDeleteModal.id}`);
      toast.success(`${showDeleteModal.full_name} removed`);
      setShowDeleteModal(null);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  const filtered = admins.filter(a =>
    !search ||
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search) ||
    a.role?.includes(search)
  );

  const activeCount    = admins.filter(a => a.is_active && !a.is_suspended).length;
  const suspendedCount = admins.filter(a => a.is_suspended).length;

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <>
      <Head><title>Admin Team — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Admin Team Management">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Admins',   value: admins.length,  icon: '👤', color: 'border-brand/30' },
            { label: 'Active',         value: activeCount,    icon: '🟢', color: 'border-green-500/30' },
            { label: 'Suspended',      value: suspendedCount, icon: '🔴', color: 'border-red-500/30' },
            { label: 'Roles',          value: roles.length,   icon: '🔐', color: 'border-blue-500/30' },
          ].map(s => (
            <div key={s.label} className={`admin-card p-4 border ${s.color}`}>
              <div className="flex items-center gap-2 mb-2"><span>{s.icon}</span></div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={() => setTab('team')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'team' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              👥 Admin Team ({admins.length})
            </button>
            <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'logs' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              📋 Audit Logs
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">+ Add Admin</button>
        </div>

        {/* Team table */}
        {tab === 'team' && (
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by name, phone or role..." />
            <div className="admin-card overflow-hidden">
              {loading ? <TableSkeleton rows={5} cols={7} /> :
               filtered.length === 0 ? <EmptyState icon="👤" title="No admins found" /> : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Admin</th><th>Role</th><th>Status</th><th>Last Active</th><th>Last IP</th><th>Joined</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map(a => {
                        const isSelf = a.phone === user?.phone;
                        const badge  = ROLE_COLORS[a.role] || 'badge-gray';
                        return (
                          <tr key={a.id} className={a.is_suspended ? 'opacity-60' : ''}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelf ? 'bg-brand/30 border-2 border-brand' : 'bg-admin-surface border border-admin-border'}`}>
                                  <span className={`text-xs font-black ${isSelf ? 'text-brand' : 'text-gray-400'}`}>{fmt.initials(a.full_name)}</span>
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium flex items-center gap-1">
                                    {a.full_name} {isSelf && <span className="text-xs text-brand">(You)</span>}
                                  </p>
                                  <p className="text-gray-600 text-xs font-mono">{a.phone}</p>
                                </div>
                              </div>
                            </td>
                            <td><span className={`badge ${badge}`}>{a.role_label || a.role}</span></td>
                            <td>
                              {a.is_suspended ? (
                                <span className="badge badge-danger">Suspended</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="status-dot status-dot-green" />
                                  <span className="text-xs text-green-400">Active</span>
                                </div>
                              )}
                            </td>
                            <td className="text-xs text-gray-500">{a.last_login_at ? timeAgo(a.last_login_at) : 'Never'}</td>
                            <td className="text-xs text-gray-600 font-mono">{a.last_login_ip || '—'}</td>
                            <td className="text-xs text-gray-500">{fmt.date(a.created_at)}</td>
                            <td>
                              {!isSelf && (
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => { setShowEditModal(a); setEditForm({ full_name: a.full_name, email: a.email || '', role_name: a.role, new_password: '' }); }}
                                    className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 text-left">✏️ Edit</button>
                                  {a.is_suspended ? (
                                    <button onClick={() => handleActivate(a)} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-900/20 text-left">✅ Activate</button>
                                  ) : (
                                    <button onClick={() => setShowSuspendModal(a)} className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded hover:bg-yellow-900/20 text-left">⏸ Suspend</button>
                                  )}
                                  <button onClick={() => setShowDeleteModal(a)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 text-left">🗑 Delete</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Roles breakdown */}
            {roles.length > 0 && (
              <>
                <h3 className="text-white font-semibold mt-6 mb-3">Role Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {roles.map(role => (
                    <div key={role.id} className="admin-card p-4">
                      <span className={`badge ${ROLE_COLORS[role.name] || 'badge-gray'} mb-2`}>{role.label}</span>
                      <p className="text-2xl font-black text-white mt-2">{role.admin_count || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Audit logs */}
        {tab === 'logs' && (
          <div className="admin-card overflow-hidden">
            <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
              <h3 className="text-white font-semibold">Admin Activity Logs</h3>
              <span className="text-xs text-gray-500">{logs.length} recent actions</span>
            </div>
            {loading ? <TableSkeleton rows={8} cols={5} /> :
             logs.length === 0 ? <EmptyState icon="📋" title="No activity yet" /> : (
              <div className="divide-y divide-admin-border">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start justify-between px-4 py-3 hover:bg-admin-hover transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{ACTION_ICONS[log.action] || '📝'}</span>
                      <div>
                        <p className="text-sm text-white font-medium">{log.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`badge ${ROLE_COLORS[log.admin_role?.toLowerCase().replace(' ','_')] || 'badge-gray'} text-xs`}>{log.admin_name}</span>
                          {log.ip_address && <span className="text-xs text-gray-600 font-mono">{log.ip_address}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0 ml-4">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Admin Modal */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Admin">
          <div className="space-y-4">
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs">The new admin will use these credentials to login to the admin dashboard.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Full Name *</label>
                <input value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Grace Phiri" className="admin-input" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Phone *</label>
                <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+265XXXXXXXXX" className="admin-input font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="admin-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Password * (min 8 chars)</label>
                <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Strong password" className="admin-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Role *</label>
                <select value={addForm.role_name} onChange={e => setAddForm(f => ({ ...f, role_name: e.target.value }))} className="admin-select w-full">
                  {ROLES.map(r => <option key={r.name} value={r.name}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 py-3">{saving ? 'Creating...' : '➕ Create Admin'}</button>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* Edit Admin Modal */}
        <Modal open={!!showEditModal} onClose={() => setShowEditModal(null)} title="Edit Admin">
          {showEditModal && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-3">
                <p className="text-white font-medium">{showEditModal.full_name}</p>
                <p className="text-gray-500 text-xs font-mono">{showEditModal.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                  <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} className="admin-input" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                  <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="admin-input" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Change Role</label>
                  <select value={editForm.role_name} onChange={e => setEditForm(f => ({ ...f, role_name: e.target.value }))} className="admin-select w-full">
                    {ROLES.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">New Password (leave blank to keep current)</label>
                  <input type="password" value={editForm.new_password} onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))} placeholder="New password..." className="admin-input" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEdit} disabled={saving} className="btn-primary flex-1 py-3">{saving ? 'Saving...' : '✓ Save Changes'}</button>
                <button onClick={() => setShowEditModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Suspend Modal */}
        <Modal open={!!showSuspendModal} onClose={() => { setShowSuspendModal(null); setSuspendReason(''); }} title="Suspend Admin">
          {showSuspendModal && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                <p className="text-red-400 font-medium">{showSuspendModal.full_name}</p>
                <p className="text-gray-500 text-xs">{showSuspendModal.phone}</p>
              </div>
              <p className="text-gray-400 text-sm">This admin will immediately lose dashboard access.</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Reason *</label>
                <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3} className="admin-input resize-none" placeholder="Enter reason..." />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSuspend} disabled={saving} className="btn-danger flex-1 py-3">{saving ? 'Suspending...' : '⛔ Confirm Suspend'}</button>
                <button onClick={() => { setShowSuspendModal(null); setSuspendReason(''); }} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Modal */}
        <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Delete Admin">
          {showDeleteModal && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">Permanently delete <strong className="text-white">{showDeleteModal.full_name}</strong>? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={saving} className="btn-danger flex-1 py-3">{saving ? 'Deleting...' : '🗑 Confirm Delete'}</button>
                <button onClick={() => setShowDeleteModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
