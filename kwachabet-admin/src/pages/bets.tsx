import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../components/layout/AdminLayout';
import { Badge, SearchBar, Pagination, TableSkeleton, EmptyState, ExportButtons, Modal } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAdminStore } from '../store/adminStore';
import toast from 'react-hot-toast';

export default function BetsPage() {
  const router = useRouter();
  const { admin, isAuthenticated } = useAdminStore();
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
    const headers = ['Ticket Code', 'User', 'Type', 'Stake', 'Odds', 'Potential Win', 'Actual Win', 'Status', 'Date'];
    const rows = tickets.map(t => [
      t.ticket_code, t.user_phone, t.type,
      t.stake, t.total_odds, t.potential_win,
      t.actual_win || '—', t.status, fmt.datetime(t.created_at)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bets_${status}.csv`;
    a.click();
    toast.success('CSV exported');
  }

  const STATUS_TABS = [
    { id: 'all',       label: 'All Bets',    icon: '🎯' },
    { id: 'pending',   label: 'Pending',     icon: '⏳' },
    { id: 'won',       label: 'Won',         icon: '🏆' },
    { id: 'lost',      label: 'Lost',        icon: '❌' },
    { id: 'cancelled', label: 'Cancelled',   icon: '🚫' },
  ];

  const filtered = tickets.filter(t =>
    !search ||
    t.ticket_code?.toLowerCase().includes(search.toLowerCase()) ||
    t.user_phone?.includes(search) ||
    t.user_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head><title>Bet Monitor — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Bet Monitoring">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {STATUS_TABS.slice(1).map(s => {
            const count = tickets.filter(t => t.status === s.id).length;
            return (
              <div key={s.id} className={`admin-card p-3 text-center cursor-pointer transition-all ${status === s.id ? 'border-brand/40 bg-brand/5' : 'hover:border-gray-600'}`}
                onClick={() => { setStatus(s.id); setPage(1); }}>
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="text-white font-bold text-lg">{count}</p>
                <p className="text-gray-500 text-xs">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(s => (
            <button key={s.id} onClick={() => { setStatus(s.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5
                ${status === s.id ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Search + Export */}
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ticket code, phone or name...">
          <ExportButtons onCSV={exportCSV} onPDF={() => toast('PDF export coming soon')} />
        </SearchBar>

        {/* Table */}
        <div className="admin-card overflow-hidden">
          {loading ? <TableSkeleton rows={8} cols={8} /> : filtered.length === 0 ? (
            <EmptyState icon="🎯" title="No bets found" subtitle="Try changing the status filter or search term" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Stake</th>
                      <th>Odds</th>
                      <th>Potential Win</th>
                      <th>Actual Win</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => (
                      <tr key={t.id} className={t.status === 'won' ? 'border-l-2 border-brand' : ''}>
                        <td>
                          <span className="font-mono text-brand font-bold text-xs">{t.ticket_code}</span>
                        </td>
                        <td>
                          <p className="text-white text-xs">{t.user_name}</p>
                          <p className="text-gray-600 text-xs font-mono">{t.user_phone}</p>
                        </td>
                        <td>
                          <span className="badge badge-info capitalize">{t.type}</span>
                        </td>
                        <td className="text-white font-medium">{fmt.mwk(t.stake)}</td>
                        <td>
                          <span className="text-yellow-400 font-bold">{fmt.odds(t.total_odds)}</span>
                        </td>
                        <td className="text-gray-300">{fmt.mwk(t.potential_win)}</td>
                        <td>
                          {t.actual_win
                            ? <span className="text-brand font-bold">{fmt.mwk(t.actual_win)}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td><Badge status={t.status} /></td>
                        <td className="text-xs text-gray-500">{fmt.datetime(t.created_at)}</td>
                        <td>
                          <button onClick={() => setSelected(t)}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-900/20 transition-colors">
                            Details
                          </button>
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

        {/* Ticket detail modal */}
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`Ticket ${selected?.ticket_code}`}>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ticket Code',   value: selected.ticket_code,                    cls: 'font-mono text-brand font-bold' },
                  { label: 'Customer',      value: `${selected.user_name} (${selected.user_phone})`, cls: 'text-white' },
                  { label: 'Bet Type',      value: selected.type,                           cls: 'capitalize text-white' },
                  { label: 'Stake',         value: fmt.mwk(selected.stake),                cls: 'text-white font-bold' },
                  { label: 'Total Odds',    value: fmt.odds(selected.total_odds),           cls: 'text-yellow-400 font-bold' },
                  { label: 'Potential Win', value: fmt.mwk(selected.potential_win),        cls: 'text-gray-300' },
                  { label: 'Actual Win',    value: selected.actual_win ? fmt.mwk(selected.actual_win) : '—', cls: 'text-brand font-bold' },
                  { label: 'Tax Deducted',  value: selected.tax_deducted ? fmt.mwk(selected.tax_deducted) : '—', cls: 'text-red-400' },
                  { label: 'Status',        value: selected.status,                         cls: 'capitalize' },
                  { label: 'Placed At',     value: fmt.datetime(selected.created_at),      cls: 'text-gray-300' },
                  { label: 'Settled At',    value: selected.settled_at ? fmt.datetime(selected.settled_at) : 'Pending', cls: 'text-gray-300' },
                ].map(item => (
                  <div key={item.label} className="bg-admin-surface rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className={`text-sm ${item.cls}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-admin-surface rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Selections</p>
                {selected.selections?.length > 0 ? (
                  <div className="space-y-2">
                    {selected.selections.map((sel: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-admin-border pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="text-white font-medium">{sel.home_team} vs {sel.away_team}</p>
                          <p className="text-gray-500">{sel.selection} · {sel.market_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 font-bold">{fmt.odds(sel.odds)}</p>
                          <Badge status={sel.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">No selection details available</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="btn-secondary w-full py-2.5">Close</button>
            </div>
          )}
        </Modal>

      </AdminLayout>
    </>
  );
}
