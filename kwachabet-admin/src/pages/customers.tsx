import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, RiskBadge, SearchBar, Modal, Pagination, TableSkeleton, EmptyState, ExportButtons } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{ type: string; user: any } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
  if (!isAuthenticated || !user) { router.push('/login'); return; }
  }, [isAuthenticated, page, filter]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (filter === 'suspended') params.suspended = true;
      if (filter === 'high_risk') params.risk_min = 70;
      const r = await adminAPI.getUsers(params);
      setCustomers(r.data.users || []);
      setTotal(Math.ceil((r.data.total || 0) / 20));
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }

  async function handleAction() {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      if (actionModal.type === 'suspend') {
        if (!reason) return toast.error('Please enter a reason');
        await adminAPI.suspendUser(actionModal.user.id, reason);
        toast.success('User suspended');
      } else {
        await adminAPI.unsuspendUser(actionModal.user.id);
        toast.success('User unsuspended');
      }
      setActionModal(null);
      setReason('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  }

  function exportCSV() {
    const headers = ['Name','Phone','Balance','Risk Score','Status','Joined'];
    const rows = customers.map(c => [
      c.full_name, c.phone, c.balance, c.risk_score,
      c.is_suspended ? 'Suspended' : 'Active', fmt.date(c.created_at)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'customers.csv';
    a.click();
    toast.success('CSV exported');
  }

  const filtered = customers.filter(c =>
    !search || c.phone?.includes(search) || c.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const FILTERS = [
    { id: 'all', label: 'All Users' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'high_risk', label: 'High Risk' },
  ];

  return (
    <>
      <Head><title>Customers — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Customer Management">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === f.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by phone or name...">
          <ExportButtons onCSV={exportCSV} onPDF={() => toast('PDF coming soon')} />
          <button onClick={load} className="btn-secondary text-sm py-2 px-3">🔄</button>
        </SearchBar>

        <div className="admin-card overflow-hidden">
          {loading ? <TableSkeleton rows={8} cols={7} /> :
           filtered.length === 0 ? <EmptyState icon="👥" title="No customers found" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr><th>Customer</th><th>Phone</th><th>Balance</th><th>Risk</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-brand/20 border border-brand/20 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-brand text-xs font-black">{fmt.initials(c.full_name)}</span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{c.full_name}</p>
                              <p className="text-gray-600 text-xs">{c.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{c.phone}</td>
                        <td className="text-green-400 font-medium">{fmt.mwk(c.balance || 0)}</td>
                        <td><RiskBadge score={c.risk_score || 0} /></td>
                        <td><Badge status={c.is_suspended ? 'suspended' : 'active'} /></td>
                        <td className="text-xs text-gray-500">{fmt.date(c.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setSelected(c)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20">View</button>
                            {c.is_suspended ? (
                              <button onClick={() => setActionModal({ type: 'unsuspend', user: c })} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded hover:bg-green-900/20">Activate</button>
                            ) : (
                              <button onClick={() => setActionModal({ type: 'suspend', user: c })} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20">Suspend</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} onPage={setPage} />
            </>
          )}
        </div>

        <Modal open={!!selected} onClose={() => setSelected(null)} title="Customer Profile">
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-brand/20 border-2 border-brand/40 rounded-full flex items-center justify-center">
                  <span className="text-brand font-black text-xl">{fmt.initials(selected.full_name)}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{selected.full_name}</p>
                  <p className="text-gray-500 text-sm">{selected.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge status={selected.is_suspended ? 'suspended' : 'active'} />
                    <RiskBadge score={selected.risk_score || 0} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Real Balance',  value: fmt.mwk(selected.balance || 0),       color: 'text-green-400' },
                  { label: 'Bonus Balance', value: fmt.mwk(selected.bonus_balance || 0), color: 'text-brand' },
                  { label: 'Risk Score',    value: `${selected.risk_score || 0}/100`,     color: selected.risk_score >= 70 ? 'text-red-400' : 'text-green-400' },
                  { label: 'Joined',        value: fmt.date(selected.created_at),         color: 'text-gray-300' },
                ].map(item => (
                  <div key={item.label} className="bg-admin-surface rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {selected.is_suspended ? (
                  <button onClick={() => { setSelected(null); setActionModal({ type: 'unsuspend', user: selected }); }} className="btn-primary flex-1">✓ Reactivate</button>
                ) : (
                  <button onClick={() => { setSelected(null); setActionModal({ type: 'suspend', user: selected }); }} className="btn-danger flex-1">⛔ Suspend</button>
                )}
                <button onClick={() => setSelected(null)} className="btn-secondary flex-1">Close</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={!!actionModal} onClose={() => { setActionModal(null); setReason(''); }} title={actionModal?.type === 'suspend' ? 'Suspend User' : 'Reactivate User'}>
          {actionModal && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                {actionModal.type === 'suspend'
                  ? `Suspend ${actionModal.user.full_name}? They will lose all access.`
                  : `Reactivate ${actionModal.user.full_name}? They will regain full access.`}
              </p>
              {actionModal.type === 'suspend' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Reason *</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="admin-input resize-none" placeholder="Enter reason..." />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleAction} disabled={actionLoading} className={actionModal.type === 'suspend' ? 'btn-danger flex-1' : 'btn-primary flex-1'}>
                  {actionLoading ? 'Processing...' : actionModal.type === 'suspend' ? 'Confirm Suspend' : 'Confirm Reactivate'}
                </button>
                <button onClick={() => { setActionModal(null); setReason(''); }} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          )}
        </Modal>
      </AdminLayout>
    </>
  );
}
