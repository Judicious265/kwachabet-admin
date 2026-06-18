import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, SearchBar, Pagination, TableSkeleton, EmptyState, ExportButtons, Modal, StatCard } from '../components/ui';
import { adminAPI, fmt } from '../lib/adminApi';
import { useAdminStore } from '../store/adminStore';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const router = useRouter();
 const { admin, isAuthenticated } = useAdminStore();
  const [tab, setTab] = useState<'pending' | 'transactions'>('pending');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [actionModal, setActionModal] = useState<{ type: string; item: any } | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    load();
  }, [isAuthenticated, tab, page, typeFilter]);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const r = await adminAPI.getPendingWithdrawals();
        setWithdrawals(r.data.withdrawals || []);
      } else {
        const params: any = { page, limit: 20 };
        if (typeFilter !== 'all') params.type = typeFilter;
        const r = await adminAPI.getTransactions(params);
        setTransactions(r.data.transactions || []);
        setTotal(Math.ceil((r.data.total || 0) / 20));
      }
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }

  async function handleApprove(id: string) {
    setActionLoading(true);
    try {
      await adminAPI.approveWithdrawal(id);
      toast.success('Withdrawal approved and processing');
      setActionModal(null);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!actionModal || !reason) return toast.error('Please enter a rejection reason');
    setActionLoading(true);
    try {
      await adminAPI.rejectWithdrawal(actionModal.item.id, reason);
      toast.success('Withdrawal rejected');
      setActionModal(null);
      setReason('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setActionLoading(false); }
  }

  function exportCSV() {
    const data = tab === 'pending' ? withdrawals : transactions;
    const csv = data.map((r: any) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tab}_payments.csv`;
    a.click();
    toast.success('Exported');
  }

  const totalPending = withdrawals.reduce((a, w) => a + parseFloat(w.amount || 0), 0);
  const flagged = withdrawals.filter(w => w.status === 'flagged').length;

  const TX_TYPES = ['all', 'deposit', 'withdrawal', 'bet_stake', 'bet_win', 'bonus_credit', 'referral_bonus'];

  const filteredWd = withdrawals.filter(w =>
    !search || w.user_phone?.includes(search) || w.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTx = transactions.filter(t =>
    !search || t.user_phone?.includes(search) || t.reference?.includes(search)
  );

  return (
    <>
      <Head><title>Payments — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Payment & Transaction Center">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Pending Withdrawals" value={withdrawals.length} icon="⏳" color="yellow" format="number" sub="Awaiting approval" />
          <StatCard label="Total Pending Amount" value={totalPending} icon="💸" color="red" format="mwk" sub="MWK to be paid" />
          <StatCard label="Flagged Withdrawals" value={flagged} icon="🚨" color={flagged > 0 ? 'red' : 'green'} format="number" sub={flagged > 0 ? 'Needs review' : 'All clear'} />
          <StatCard label="Payment Providers" value="3" icon="🏦" color="blue" format="plain" sub="Airtel · TNM · Bank" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'pending' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
            ⏳ Pending Withdrawals {withdrawals.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{withdrawals.length}</span>}
          </button>
          <button onClick={() => setTab('transactions')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'transactions' ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
            📋 All Transactions
          </button>
        </div>

        {/* Search + Filter */}
        <SearchBar value={search} onChange={setSearch} placeholder="Search by phone, name or reference...">
          {tab === 'transactions' && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="admin-select text-sm">
              {TX_TYPES.map(t => <option key={t} value={t} className="capitalize">{t === 'all' ? 'All Types' : t.replace('_', ' ')}</option>)}
            </select>
          )}
          <ExportButtons onCSV={exportCSV} onPDF={() => toast('PDF coming soon')} />
        </SearchBar>

        {/* Pending Withdrawals */}
        {tab === 'pending' && (
          <div className="admin-card overflow-hidden">
            {loading ? <TableSkeleton rows={5} cols={7} /> : filteredWd.length === 0 ? (
              <EmptyState icon="✅" title="No pending withdrawals" subtitle="All withdrawals have been processed" />
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Destination</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Requested</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWd.map(w => (
                      <tr key={w.id} className={w.status === 'flagged' ? 'border-l-2 border-red-500' : ''}>
                        <td>
                          <p className="text-white text-sm font-medium">{w.user_name}</p>
                          <p className="text-gray-600 text-xs font-mono">{w.user_phone}</p>
                        </td>
                        <td>
                          <p className="text-white font-bold text-sm">{fmt.mwk(w.amount)}</p>
                          {w.fraud_score > 0 && <p className="text-red-400 text-xs">Risk: {w.fraud_score}/100</p>}
                        </td>
                        <td>
                          <span className="badge badge-info capitalize">{w.payment_method}</span>
                        </td>
                        <td className="font-mono text-xs text-gray-300">{w.destination}</td>
                        <td>
                          <div className={`text-xs font-bold ${w.risk_score >= 70 ? 'text-red-400' : w.risk_score >= 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {w.risk_score || 0}/100
                          </div>
                        </td>
                        <td><Badge status={w.status} /></td>
                        <td className="text-xs text-gray-500">{fmt.datetime(w.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleApprove(w.id)}
                              className="text-xs bg-brand text-black font-bold px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors">
                              Approve
                            </button>
                            <button onClick={() => setActionModal({ type: 'reject', item: w })}
                              className="text-xs border border-red-700 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors">
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* All Transactions */}
        {tab === 'transactions' && (
          <div className="admin-card overflow-hidden">
            {loading ? <TableSkeleton rows={8} cols={7} /> : filteredTx.length === 0 ? (
              <EmptyState icon="📋" title="No transactions found" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance After</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.map(t => {
                        const isCredit = parseFloat(t.amount) > 0;
                        return (
                          <tr key={t.id}>
                            <td>
                              <p className="text-white text-xs font-medium">{t.user_name}</p>
                              <p className="text-gray-600 text-xs font-mono">{t.user_phone}</p>
                            </td>
                            <td>
                              <span className="badge badge-info text-xs capitalize">{t.type?.replace('_', ' ')}</span>
                            </td>
                            <td>
                              <span className={`font-bold text-sm ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                                {isCredit ? '+' : ''}{fmt.mwk(Math.abs(parseFloat(t.amount)))}
                              </span>
                            </td>
                            <td className="text-gray-400 text-sm">{fmt.mwk(t.balance_after)}</td>
                            <td className="text-xs text-gray-500 capitalize">{t.payment_method || '—'}</td>
                            <td className="font-mono text-xs text-gray-600 max-w-xs truncate">{t.reference || '—'}</td>
                            <td><Badge status={t.status} /></td>
                            <td className="text-xs text-gray-500">{fmt.datetime(t.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={total} onPage={setPage} />
              </>
            )}
          </div>
        )}

        {/* Reject modal */}
        <Modal open={actionModal?.type === 'reject'} onClose={() => { setActionModal(null); setReason(''); }} title="Reject Withdrawal">
          {actionModal && (
            <div className="space-y-4">
              <div className="bg-admin-surface rounded-xl p-4">
                <p className="text-sm text-white font-medium">{actionModal.item.user_name}</p>
                <p className="text-gray-500 text-xs">{actionModal.item.user_phone}</p>
                <p className="text-red-400 font-bold mt-2">{fmt.mwk(actionModal.item.amount)}</p>
                <p className="text-gray-500 text-xs">to {actionModal.item.destination} via {actionModal.item.payment_method}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Rejection reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3} className="admin-input resize-none" />
              </div>
              <p className="text-xs text-gray-500">The user's funds will be released back to their wallet.</p>
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={actionLoading} className="btn-danger flex-1">
                  {actionLoading ? 'Processing...' : 'Confirm Rejection'}
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
