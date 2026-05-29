import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, Modal } from '../components/ui';
import { fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import axios from 'axios';

const ROLES = [
  { id: 'super_admin',       label: 'Super Admin',       color: 'badge-danger',   desc: 'Full access to everything', permissions: ['all'] },
  { id: 'finance_admin',     label: 'Finance Admin',     color: 'badge-warning',  desc: 'Payments and withdrawals', permissions: ['payments', 'reports'] },
  { id: 'customer_support',  label: 'Customer Support',  color: 'badge-info',     desc: 'Customer management', permissions: ['customers'] },
  { id: 'fraud_analyst',     label: 'Fraud Analyst',     color: 'badge-purple',   desc: 'Fraud detection and risk', permissions: ['fraud', 'customers'] },
  { id: 'odds_manager',      label: 'Odds Manager',      color: 'badge-success',  desc: 'Sports and odds management', permissions: ['sports'] },
  { id: 'moderator',         label: 'Moderator',         color: 'badge-gray',     desc: 'General moderation', permissions: ['bets', 'customers'] },
];

const PERMISSIONS_MAP: Record<string, string[]> = {
  all:       ['Dashboard', 'Customers', 'Bets', 'Payments', 'Fraud', 'Sports', 'Tax', 'Reports', 'Admins', 'Settings'],
  payments:  ['Dashboard', 'Payments', 'Reports'],
  customers: ['Dashboard', 'Customers'],
  fraud:     ['Dashboard', 'Fraud', 'Customers'],
  sports:    ['Dashboard', 'Sports'],
  bets:      ['Dashboard', 'Bets'],
  reports:   ['Dashboard', 'Reports'],
};

export default function AdminsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState<any>(null);
  const [inviteForm, setInviteForm] = useState({ phone: '+265', full_name: '', role: 'customer_support' });
  const [saving, setSaving] = useState(false);
  const [auditLog] = useState([
    { admin: 'Charles Banda', action: 'Approved withdrawal MWK 50,000', time: '5 min ago', icon: '✅' },
  ]);

  // Load admins from API on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    async function fetchAdmins() {
      try {
        const response = await axios.get('/api/admins');
        setAdmins(response.data);
      } catch (err) {
        toast.error('Failed to load admin accounts');
      } finally {
        setLoading(false);
      }
    }

    fetchAdmins();
  }, [isAuthenticated]);

  if (!isAuthenticated || !user?.is_admin) {
    return null;
  }

  async function inviteAdmin() {
    if (!inviteForm.phone || !inviteForm.full_name) {
      return toast.error('Please fill in all fields');
    }
    setSaving(true);
    try {
      const response = await axios.post('/api/admins', {
        name: inviteForm.full_name,
        phone: inviteForm.phone,
        role: inviteForm.role,
      });

      setAdmins(prev => [...prev, response.data]);
      toast.success(`Admin invite sent to ${inviteForm.full_name}`);
      setShowInviteModal(false);
      setInviteForm({ phone: '+265', full_name: '', role: 'customer_support' });
    } catch (error: any) { 
      toast.error(error.response?.data?.message || 'Failed to invite admin'); 
    } finally { 
      setSaving(false); 
    }
  }

  function getRoleMeta(roleId: string) {
    return ROLES.find(r => r.id === roleId) || ROLES[5];
  }

  function getPermissions(roleId: string) {
    const role = getRoleMeta(roleId);
    const perms = role.permissions.flatMap(p => PERMISSIONS_MAP[p] || []);
    return [...new Set(perms)];
  }

  async function removeAdmin(id: string) {
    if (!confirm('Remove this admin? They will lose all access.')) return;
    try {
      await axios.delete(`/api/admins/${id}`);
      setAdmins(prev => prev.filter(a => a.id !== id));
      toast.success('Admin removed');
    } catch {
      toast.error('Failed to delete admin');
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (loading) {
    return (
      <AdminLayout title="Loading Admins...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head><title>Admin Team — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Admin Team Management">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Admins',   value: admins.length,                                          icon: '👤', color: 'border-brand/30' },
            { label: 'Active Now',     value: admins.filter(a => a.status === 'active').length,        icon: '🟢', color: 'border-green-500/30' },
            { label: 'Admin Roles',    value: ROLES.length,                                            icon: '🔐', color: 'border-blue-500/30' },
            { label: 'Recent Actions', value: auditLog.length,                                        icon: '📋', color: 'border-purple-500/30' },
          ].map(s => (
            <div key={s.label} className={`admin-card p-4 border ${s.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Admin Accounts</h3>
          <button onClick={() => setShowInviteModal(true)} className="btn-primary text-sm">
            + Invite Admin
          </button>
        </div>

        {/* Admin list */}
        <div className="admin-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => {
                  const role = getRoleMeta(admin.role);
                  const perms = getPermissions(admin.role);
                  const isSelf = admin.phone === user?.phone;
                  return (
                    <tr key={admin.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelf ? 'bg-brand/30 border-2 border-brand' : 'bg-admin-surface border border-admin-border'}`}>
                            <span className={`text-xs font-black ${isSelf ? 'text-brand' : 'text-gray-400'}`}>
                              {fmt.initials(admin.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium flex items-center gap-1">
                              {admin.name}
                              {isSelf && <span className="text-xs text-brand">(You)</span>}
                            </p>
                            <p className="text-gray-600 text-xs font-mono">{admin.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${role.color}`}>{role.label}</span>
                      </td>
                      <td>
                        <button onClick={() => setShowPermModal({ admin, perms, role })}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          {perms.length} permissions →
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className={`status-dot ${admin.status === 'active' ? 'status-dot-green' : 'status-dot-red'}`} />
                          <span className="text-xs text-gray-400 capitalize">{admin.status}</span>
                        </div>
                      </td>
                      <td className="text-xs text-gray-500">{timeAgo(admin.last_active)}</td>
                      <td className="text-xs text-gray-500">{fmt.date(admin.joined)}</td>
                      <td>
                        {!isSelf && (
                          <button onClick={() => removeAdmin(admin.id)}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite modal */}
        <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New Admin">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
              <input value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Grace Phiri" className="admin-input" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Phone Number</label>
              <input value={inviteForm.phone} onChange={e => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+265XXXXXXXXX" className="admin-input font-mono" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Assign Role</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                className="admin-select w-full">
                {ROLES.filter(r => r.id !== 'super_admin').map(r => (
                  <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={inviteAdmin} disabled={saving} className="btn-primary flex-1 py-3">
                {saving ? 'Sending invite...' : '✉️ Grant Admin Access'}
              </button>
              <button onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        </Modal>

        {/* Permissions modal */}
        <Modal open={!!showPermModal} onClose={() => setShowPermModal(null)} title="Admin Permissions">
          {showPermModal && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-admin-surface border border-admin-border rounded-full flex items-center justify-center">
                  <span className="text-white font-black">{fmt.initials(showPermModal.admin.name)}</span>
                </div>
                <div>
                  <p className="text-white font-bold">{showPermModal.admin.name}</p>
                  <span className={`badge ${showPermModal.role.color} mt-1`}>{showPermModal.role.label}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">GRANTED ACCESS TO:</p>
                <div className="grid grid-cols-2 gap-2">
                  {showPermModal.perms.map((p: string) => (
                    <div key={p} className="flex items-center gap-2 bg-admin-surface rounded-lg p-2.5">
                      <span className="text-green-400 text-xs">✓</span>
                      <span className="text-gray-300 text-sm">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowPermModal(null)} className="btn-secondary w-full py-2.5">Close</button>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
