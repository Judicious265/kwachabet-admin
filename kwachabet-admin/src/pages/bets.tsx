import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, SearchBar, Pagination, TableSkeleton, EmptyState, ExportButtons, Modal } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

export default function BetsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    load();
  }, [isAuthenticated, page, status]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (status !== 'all') params.status = status;
      const r = await adminAPI.getTickets(params);
      setTickets(r.data.tickets || []);
      setTotal(Math.ceil((r.data.total || 0) / 25));
    } catch { toast.error('Failed to load bets'); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const headers = ['Ticket Code','User','Type','Stake','Odds','Potential Win','Status','Date'];
    const rows = tickets.map(t => [t.ticket_code, t.user_phone, t.type, t.stake, t.total_odds, t.potential_win, t.status, fmt.datetime(t.created_at)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bets_${status}.csv`;
    a.click();
    toast.success('Exported');
  }

  const STATUS_TABS = [
    { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' },
    { id: 'won', label: 'Won' }, { id: 'lost', label: 'Lost' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filtered = tickets.filter(t =>
    !search || t.ticket_code?.toLowerCase().includes(search.toLowerCase()) || t.user_phone?.includes(search)
  );

  return (
    <>
      <Head><title>Bet Monitor — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Bet Monitoring">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(s => (
            <button key={s.id} onClick={() => { setStatus(s.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${status === s.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Search by ticket code or phone...">
          <ExportButtons onCSV={exportCSV} onPDF={() => toast('PDF coming soon')} />
        </SearchBar>

        <div className="admin-card overflow-hidden">
          {loading ? <TableSkeleton rows={8} cols={8} /> :
           filtered.length === 0 ? <EmptyState icon="🎯" title="No bets found" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr><th>Ticket</th><th>Customer</th><th>Type</th><th>Stake</th><th>Odds</th><th>Potential Win</th><th>Actual Win</th><th>Status</th><th>Date</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id}>
                        <td><span className="font-mono text-brand font-bold text-xs">{t.ticket_code}</span></td>
                        <td>
                          <p className="text-white text-xs">{t.user_name}</p>
                          <p className="text-gray-600 text-xs font-mono">{t.user_phone}</p>
                        </td>
                        <td><span className="badge badge-info capitalize">{t.type}</span></td>
                        <td className="text-white font-medium">{fmt.mwk(t.stake)}</td>
                        <td><span className="text-yellow-400 font-bold">{fmt.odds(t.total_odds)}</span></td>
                        <td className="text-gray-300">{fmt.mwk(t.potential_win)}</td>
                        <td>{t.actual_win ? <span className="text-brand font-bold">{fmt.mwk(t.actual_win)}</span> : <span className="text-gray-600">—</span>}</td>
                        <td><Badge status={t.status} /></td>
                        <td className="text-xs text-gray-500">{fmt.datetime(t.created_at)}</td>
                        <td><button onClick={() => setSelected(t)} className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20">Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} onPage={setPage} />
            </>
          )}
        </div>

        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket ${selected?.ticket_code}`}>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ticket Code',   value: selected.ticket_code,          cls: 'font-mono text-brand font-bold' },
                  { label: 'Customer',      value: selected.user_phone,            cls: 'text-white' },
                  { label: 'Stake',         value: fmt.mwk(selected.stake),       cls: 'text-white font-bold' },
                  { label: 'Total Odds',    value: fmt.odds(selected.total_odds),  cls: 'text-yellow-400 font-bold' },
                  { label: 'Potential Win', value: fmt.mwk(selected.potential_win),cls: 'text-gray-300' },
                  { label: 'Actual Win',    value: selected.actual_win ? fmt.mwk(selected.actual_win) : '—', cls: 'text-brand font-bold' },
                  { label: 'Status',        value: selected.status,                cls: 'capitalize' },
                  { label: 'Placed At',     value: fmt.datetime(selected.created_at), cls: 'text-gray-300' },
                ].map(item => (
                  <div key={item.label} className="bg-admin-surface rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className={`text-sm ${item.cls}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelected(null)} className="btn-secondary w-full py-2.5">Close</button>
            </div>
          )}
        </Modal>
      </AdminLayout>
    </>
  );
}
