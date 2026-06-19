import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layouts/AdminLayout';
import { Modal, EmptyState, TableSkeleton, Pagination, SearchBar } from '../components/ui';
import { adminTeamAPI, fmt, ROLE_COLORS } from '../lib/adminApi';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const ROLES = [
  { name: 'customer_support', label: 'Customer Support', desc: 'Customer management and withdrawals' },
  { name: 'fraud_analyst',    label: 'Fraud Analyst',    desc: 'Fraud detection and risk monitoring' },
  { name: 'odds_manager',     label: 'Odds Manager',     desc: 'Sports, odds and match settlement' },
  { name: 'finance_admin',    label: 'Finance Admin',    desc: 'Payments, revenue and tax reports' },
];

export default function AdminsPage() {
  const router = useRouter();
 const { user, isAuthenticated } = useAuthStore();

  const [admins, setAdmins]         = useState<any[]>([]);
  const [roles, setRoles]           = useState<any[]>([]);
  const [logs, setLogs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [search, setSearch]         = useState('');
  const [tab, setTab]               = useState<'team' | 'logs'>('team');

  // Modals
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showEditModal, setShowEditModal]     = useState<any>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<any>(null);
  const [saving, setSaving]                   = useState(false);

  const [addForm, setAddForm] = useState({
    full_name: '', phone: '+265', email: '', password: '', role_name: 'customer_support',
  });
  const [suspendReason, setSuspendReason] = useState('');
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role_name: '', new_password: '' });

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!hasPermission('admins', 'can_view')) { router.push('/'); return; }
    loadAll();
  }, [isAuthenticated]);

  async function loadAll() {
    setLoading(true);
    setLogsLoading(true);
    try {
      const [adminsRes, rolesRes] = await Promise.all([
        adminTeamAPI.list(),
        adminTeamAPI.getRoles(),
      ]);
      setAdmins(adminsRes.data.admins || []);
      setRoles(rolesRes.data.roles || []);
    } catch (err: any) {
      toast.error('Failed to load admin team');
    } finally {
      setLoading(false);
    }
    try {
      const logsRes = await adminTeamAPI.getLogs({ limit: 50 });
      setLogs(logsRes.data.logs || []);
    } catch { } finally {
      setLogsLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!addForm.full_name || !addForm.phone || !addForm.password || !addForm.role_name) {
      return toast.error('All fields are required');
    }
    if (addForm.password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await adminTeamAPI.create(addForm);
      toast.success(`Admin account created for ${addForm.full_name}`);
      setShowAddModal(false);
      setAddForm({ full_name: '', phone: '+265', email: '', password: '', role_name: 'customer_support' });
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  async function handleEditAdmin() {
    if (!showEditModal) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (editForm.full_name)   payload.full_name   = editForm.full_name;
      if (editForm.email)       payload.email       = editForm.email;
      if (editForm.role_name)   payload.role_name   = editForm.role_name;
      if (editForm.new_password) payload.new_password = editForm.new_password;
      await adminTeamAPI.update(showEditModal.id, payload);
      toast.success('Admin updated');
      setShowEditModal(null);
      setEditForm({ full_name: '', email: '', role_name: '', new_password: '' });
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  async function handleSuspend() {
    if (!showSuspendModal || !suspendReason) return toast.error('Reason required');
    setSaving(true);
    try {
      await adminTeamAPI.suspend(showSuspendModal.id, { reason: suspendReason });
      toast.success(`${showSuspendModal.full_name} suspended`);
      setShowSuspendModal(null);
      setSuspendReason('');
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  async function handleActivate(admin: any) {
    try {
      await adminTeamAPI.activate(admin.id);
      toast.success(`${admin.full_name} reactivated`);
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    if (!showDeleteModal) return;
    setSaving(true);
    try {
      await adminTeamAPI.delete(showDeleteModal.id);
      toast.success(`${showDeleteModal.full_name} removed`);
      setShowDeleteModal(null);
      loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  }

  const filtered = admins.filter(a =>
    !search ||
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search) ||
    a.role?.includes(search)
  );

  const activeCount    = admins.filter(a => a.is_active && !a.is_suspended).length;
  const suspendedCount = admins.filter(a => a.is_suspended).length;

  const ACTION_ICONS: Record<string, string> = {
    login:              '🔐',
    suspend_admin:      '⛔',
    activate_admin:     '✅',
    create_admin:       '➕',
    delete_admin:       '🗑️',
    update_admin:       '✏️',
    suspend_user:       '🚫',
    unsuspend_user:     '✓',
    approve_withdrawal: '💸',
    reject_withdrawal:  '❌',
    update_odds:        '📊',
    set_result:         '🏁',
    resolve_fraud:      '🛡️',
    create_event:       '⚽',
  };

  return (
    <>
      <Head><title>Admin Team — Kwacha Bet</title></Head>
      <AdminLayout title="Admin Team Management">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1">Total Admins</p>
            <p className="text-2xl font-black text-white">{admins.length}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-black text-green-400">{activeCount}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1">Suspended</p>
            <p className={`text-2xl font-black ${suspendedCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>{suspendedCount}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1">Roles</p>
            <p className="text-2xl font-black text-brand">{roles.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={() => setTab('team')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'team' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              👥 Admin Team ({admins.length})
            </button>
            <button onClick={() => setTab('logs')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'logs' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              📋 Audit Logs
            </button>
          </div>
          {hasPermission('admins', 'can_create') && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm">
              + Add Admin
            </button>
          )}
        </div>

        {/* Admin Team Table */}
        {tab === 'team' && (
          <>
            <SearchBar value={search} onChange={setSearch} placeholder="Search by name, phone or role..." />
            <div className="admin-card overflow-hidden">
              {loading ? <TableSkeleton rows={5} cols={7} /> :
               filtered.length === 0 ? (
                 <EmptyState icon="👤" title="No admins found" subtitle="Add your first admin team member" />
               ) : (
                 <div className="overflow-x-auto">
                   <table className="admin-table">
                     <thead>
                       <tr>
                         <th>Admin</th>
                         <th>Role</th>
                         <th>Status</th>
                         <th>Last Active</th>
                         <th>Last IP</th>
                         <th>Added By</th>
                         <th>Joined</th>
                         <th>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filtered.map(a => {
                         const isSelf   = a.id === currentAdmin?.id;
                         const roleBadge = ROLE_COLORS[a.role] || 'badge-gray';
                         return (
                           <tr key={a.id} className={a.is_suspended ? 'opacity-60' : ''}>
                             <td>
                               <div className="flex items-center gap-2">
                                 <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelf ? 'bg-brand/30 border-2 border-brand' : 'bg-admin-surface border border-admin-border'}`}>
                                   <span className={`text-xs font-black ${isSelf ? 'text-brand' : 'text-gray-400'}`}>
                                     {fmt.initials(a.full_name)}
                                   </span>
                                 </div>
                                 <div>
                                   <p className="text-white text-sm font-medium flex items-center gap-1">
                                     {a.full_name}
                                     {isSelf && <span className="text-xs text-brand">(You)</span>}
                                   </p>
                                   <p className="text-gray-600 text-xs font-mono">{a.phone}</p>
                                   {a.email && <p className="text-gray-700 text-xs truncate max-w-[140px]">{a.email}</p>}
                                 </div>
                               </div>
                             </td>
                             <td>
                               <span className={`badge ${roleBadge}`}>{a.role_label}</span>
                             </td>
                             <td>
                               {a.is_suspended ? (
                                 <span className="badge badge-danger">Suspended</span>
                               ) : a.is_active ? (
                                 <div className="flex items-center gap-1.5">
                                   <span className="status-dot status-dot-green" />
                                   <span className="text-xs text-green-400">Active</span>
                                 </div>
                               ) : (
                                 <span className="badge badge-gray">Inactive</span>
                               )}
                             </td>
                             <td className="text-xs text-gray-500">
                               {a.last_login_at ? fmt.timeAgo(a.last_login_at) : 'Never'}
                             </td>
                             <td className="text-xs text-gray-600 font-mono">
                               {a.last_login_ip || '—'}
                             </td>
                             <td className="text-xs text-gray-500">
                               {a.created_by_name || 'System'}
                             </td>
                             <td className="text-xs text-gray-500">{fmt.date(a.created_at)}</td>
                             <td>
                               {!isSelf && hasPermission('admins', 'can_edit') && (
                                 <div className="flex flex-col gap-1">
                                   <button
                                     onClick={() => { setShowEditModal(a); setEditForm({ full_name: a.full_name, email: a.email || '', role_name: a.role, new_password: '' }); }}
                                     className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors text-left">
                                     ✏️ Edit
                                   </button>
                                   {a.is_suspended ? (
                                     <button onClick={() => handleActivate(a)}
                                       className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-900/20 transition-colors text-left">
                                       ✅ Activate
                                     </button>
                                   ) : (
                                     <button onClick={() => setShowSuspendModal(a)}
                                       className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded hover:bg-yellow-900/20 transition-colors text-left">
                                       ⏸ Suspend
                                     </button>
                                   )}
                                   {hasPermission('admins', 'can_delete') && (
                                     <button onClick={() => setShowDeleteModal(a)}
                                       className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors text-left">
                                       🗑 Delete
                                     </button>
                                   )}
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
            <h3 className="text-white font-semibold mt-6 mb-3">Role Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {roles.map(role => {
                const badge = ROLE_COLORS[role.name] || 'badge-gray';
                return (
                  <div key={role.id} className="admin-card p-4">
                    <span className={`badge ${badge} mb-2`}>{role.label}</span>
                    <p className="text-2xl font-black text-white mt-2">{role.admin_count}</p>
                    <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Audit Logs */}
        {tab === 'logs' && (
          <div className="admin-card overflow-hidden">
            <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
              <h3 className="text-white font-semibold">Admin Activity Logs</h3>
              <span className="text-xs text-gray-500">{logs.length} recent actions</span>
            </div>
            {logsLoading ? <TableSkeleton rows={8} cols={5} /> :
             logs.length === 0 ? (
               <EmptyState icon="📋" title="No activity yet" subtitle="Admin actions will appear here" />
             ) : (
               <div className="divide-y divide-admin-border">
                 {logs.map(log => (
                   <div key={log.id} className="flex items-start justify-between px-4 py-3 hover:bg-admin-hover transition-colors">
                     <div className="flex items-start gap-3">
                       <span className="text-lg flex-shrink-0 mt-0.5">
                         {ACTION_ICONS[log.action] || '📝'}
                       </span>
                       <div>
                         <p className="text-sm text-white font-medium">{log.description}</p>
                         <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                           <span className={`badge ${ROLE_COLORS[log.admin_role?.toLowerCase().replace(' ', '_')] || 'badge-gray'} text-xs`}>
                             {log.admin_name}
                           </span>
                           {log.ip_address && (
                             <span className="text-xs text-gray-600 font-mono">{log.ip_address}</span>
                           )}
                         </div>
                       </div>
                     </div>
                     <span className="text-xs text-gray-600 flex-shrink-0 ml-4">{fmt.timeAgo(log.created_at)}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* ── Add Admin Modal ── */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Admin">
          <div className="space-y-4">
            <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
              <p className="text-brand text-xs">The new admin will use these credentials to login to the admin dashboard. Their access is determined by the role you assign.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Full Name *</label>
                <input value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Grace Phiri" className="admin-input" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Phone *</label>
                <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+265XXXXXXXXX" className="admin-input font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email (optional)</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com" className="admin-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Password * (min 8 chars)</label>
                <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Strong password" className="admin-input" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1.5">Role *</label>
                <select value={addForm.role_name} onChange={e => setAddForm(f => ({ ...f, role_name: e.target.value }))}
                  className="admin-select w-full">
                  {ROLES.map(r => (
                    <option key={r.name} value={r.name}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddAdmin} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Creating...' : '➕ Create Admin Account'}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* ── Edit Admin Modal ── */}
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
                  <input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                    className="admin-input" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                  <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="admin-input" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Change Role</label>
                  <select value={editForm.role_name} onChange={e => setEditForm(f => ({ ...f, role_name: e.target.value }))}
                    className="admin-select w-full">
                    {ROLES.map(r => (
                      <option key={r.name} value={r.name}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">New Password (leave blank to keep current)</label>
                  <input type="password" value={editForm.new_password} onChange={e => setEditForm(f => ({ ...f, new_password: e.target.value }))}
                    placeholder="New password..." className="admin-input" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditAdmin} disabled={saving} className="btn-primary flex-1 py-3">
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
                <button onClick={() => setShowEditModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Suspend Modal ── */}
        <Modal open={!!showSuspendModal} onClose={() => { setShowSuspendModal(null); setSuspendReason(''); }} title="Suspend Admin">
          {showSuspendModal && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
                <p className="text-red-400 text-sm font-medium">{showSuspendModal.full_name}</p>
                <p className="text-gray-500 text-xs">{showSuspendModal.role_label} · {showSuspendModal.phone}</p>
              </div>
              <p className="text-gray-400 text-sm">This admin will immediately lose access to the dashboard.</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Reason *</label>
                <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                  placeholder="Enter reason for suspension..." rows={3} className="admin-input resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSuspend} disabled={saving} className="btn-danger flex-1 py-3">
                  {saving ? 'Suspending...' : '⛔ Confirm Suspend'}
                </button>
                <button onClick={() => { setShowSuspendModal(null); setSuspendReason(''); }} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Delete Modal ── */}
        <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Delete Admin">
          {showDeleteModal && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Are you sure you want to permanently delete <strong className="text-white">{showDeleteModal.full_name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={saving} className="btn-danger flex-1 py-3">
                  {saving ? 'Deleting...' : '🗑 Confirm Delete'}
                </button>
                <button onClick={() => setShowDeleteModal(null)} className="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
