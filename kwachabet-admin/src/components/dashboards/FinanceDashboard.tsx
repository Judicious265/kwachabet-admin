import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import AdminLayout from '../layouts/AdminLayout';
import { StatCard, Skeleton, EmptyState, Modal } from '../ui';
import { paymentsAPI, betsAPI, taxAPI, fmt } from '../../lib/adminApi';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';

const TAX_RATE = 0.20;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt.mwk(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function FinanceDashboard() {
  const { admin } = useAdminStore();
  const [pending, setPending]     = useState<any[]>([]);
  const [txns, setTxns]           = useState<any[]>([]);
  const [winTickets, setWinTickets] = useState<any[]>([]);
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [pR, tR, wR, taxR] = await Promise.allSettled([
        paymentsAPI.pending(),
        betsAPI.transactions({ limit: 20 }),
        taxAPI.records({ limit: 50 }),
        taxAPI.summary(),
      ]);
      if (pR.status === 'fulfilled')   setPending(pR.value.data.withdrawals || []);
      if (tR.status === 'fulfilled')   setTxns(tR.value.data.transactions || []);
      if (wR.status === 'fulfilled')   setWinTickets(wR.value.data.tickets || []);
      if (taxR.status === 'fulfilled') setTaxSummary(taxR.value.data);
      setLastUpdated(new Date());
    } catch { toast.error('Failed to load financial data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  async function handleApprove(id: string) {
    setProcessing(id);
    try {
      await paymentsAPI.approve(id);
      toast.success('✅ Withdrawal approved and processing');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(null); }
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return toast.error('Rejection reason required');
    setProcessing(rejectModal.id);
    try {
      await paymentsAPI.reject(rejectModal.id, rejectReason);
      toast.success('Withdrawal rejected — funds returned to customer');
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(null); }
  }

  function exportCSV() {
    const headers = ['Ticket Code','Customer','Phone','Gross Win','Tax (20%)','Net Paid','Date'];
    const rows = winTickets.map(t => [
      t.ticket_code,
      t.user_name || '—',
      t.user_phone,
      t.potential_win,
      (parseFloat(t.tax_deducted || 0) || parseFloat(t.potential_win || 0) * TAX_RATE).toFixed(2),
      t.actual_win || '—',
      fmt.datetime(t.settled_at || t.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kwachabet_tax_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Tax report exported');
  }

  async function exportPDF() {
    try {
      const jsPDF     = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      doc.setFillColor(0, 200, 83);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16); doc.setFont('helvetica','bold');
      doc.text('KWACHA BET', 14, 11);
      doc.setFontSize(10);
      doc.text('WITHHOLDING TAX REPORT — 20%', 14, 20);
      doc.setTextColor(100,100,100); doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()} by ${admin?.full_name}`, 14, 36);

      // Tax summary boxes
      const summaryItems = [
        { label: 'DAILY TAX',   value: fmt.mwk(taxSummary?.daily || 0),   x: 14 },
        { label: 'MONTHLY TAX', value: fmt.mwk(taxSummary?.monthly || 0), x: 80 },
        { label: 'TOTAL TAX',   value: fmt.mwk(taxSummary?.total || 0),   x: 146 },
      ];
      summaryItems.forEach(item => {
        doc.setFillColor(30,30,50); doc.rect(item.x, 42, 58, 18, 'F');
        doc.setTextColor(150,150,150); doc.setFontSize(7);
        doc.text(item.label, item.x+2, 48);
        doc.setTextColor(0,200,83); doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text(item.value, item.x+2, 56);
      });

      autoTable(doc, {
        startY: 68,
        head: [['Ticket','Customer','Phone','Gross Win','Tax (20%)','Net Paid','Date']],
        body: winTickets.slice(0,80).map(t => [
          t.ticket_code,
          t.user_name || '—',
          t.user_phone,
          fmt.mwk(t.potential_win),
          fmt.mwk(parseFloat(t.tax_deducted||0) || parseFloat(t.potential_win||0)*TAX_RATE),
          fmt.mwk(t.actual_win || 0),
          fmt.date(t.settled_at || t.created_at),
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0,200,83], textColor: [0,0,0] },
        alternateRowStyles: { fillColor: [245,245,245] },
      });

      const pages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(150,150,150);
        doc.text('CONFIDENTIAL — KwachaBet Tax Report', 14, 290);
        doc.text(`Page ${i} of ${pages}`, 180, 290);
      }

      doc.save(`kwachabet_tax_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch { toast.error('PDF export failed — try CSV instead'); }
  }

  // Build transaction chart from real data
  const deposits     = txns.filter(t => t.type === 'deposit');
  const withdrawals  = txns.filter(t => t.type === 'withdrawal');
  const chartData    = txns.slice(0, 10).map(t => ({
    time:   fmt.datetime(t.created_at),
    amount: Math.abs(parseFloat(t.amount || 0)),
    type:   t.type,
  }));

  const totalDeposits    = deposits.reduce((a,t) => a + Math.abs(parseFloat(t.amount||0)), 0);
  const totalWithdrawals = withdrawals.reduce((a,t) => a + Math.abs(parseFloat(t.amount||0)), 0);
  const totalTax         = winTickets.reduce((a,t) => a + parseFloat(t.tax_deducted||0), 0);
  const totalGross       = winTickets.reduce((a,t) => a + parseFloat(t.potential_win||0), 0);

  return (
    <AdminLayout title="Finance Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome, <span className="text-white font-semibold">{admin?.full_name}</span></p>
          <p className="text-purple-400 text-xs font-medium mt-0.5">🟣 Finance Admin · Updated {lastUpdated.toLocaleTimeString('en-GB')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-xs py-2 px-3">📥 CSV</button>
          <button onClick={exportPDF} className="btn-secondary text-xs py-2 px-3">📄 PDF</button>
          <button onClick={load} className="btn-secondary text-xs py-2 px-3">🔄</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Pending Withdrawals" value={pending.length}   icon="⏳" color={pending.length>0?'yellow':'green'} format="number" sub="Awaiting approval" />
        <StatCard label="Total Deposits"       value={totalDeposits}   icon="💰" color="green"  format="mwk" sub="From transactions" />
        <StatCard label="Total Withdrawals"    value={totalWithdrawals}icon="💸" color="red"    format="mwk" sub="Paid out" />
        <StatCard label="Tax Collected"        value={taxSummary?.total || totalTax} icon="📋" color="purple" format="mwk" sub="20% withholding" />
      </div>

      {/* Tax summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Daily Tax',   value: taxSummary?.daily   || 0, icon: '📅', color: 'border-blue-500/30' },
          { label: 'Weekly Tax',  value: taxSummary?.weekly  || 0, icon: '📆', color: 'border-green-500/30' },
          { label: 'Monthly Tax', value: taxSummary?.monthly || 0, icon: '🗓️', color: 'border-yellow-500/30' },
          { label: 'Annual Tax',  value: taxSummary?.annual  || 0, icon: '📊', color: 'border-purple-500/30' },
        ].map(item => (
          <div key={item.label} className={`admin-card p-4 border ${item.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span>{item.icon}</span>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
            <p className="text-xl font-black text-red-400">{loading ? '—' : fmt.mwk(item.value)}</p>
            <p className="text-xs text-gray-600 mt-1">Withheld from winnings</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="admin-card p-4">
          <h3 className="text-white font-semibold mb-4">Recent Transactions</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill:'#6B7280', fontSize:8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#6B7280', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>(v/1000).toFixed(0)+'K'} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Amount" fill="#00C853" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="No transactions yet" />
          )}
        </div>

        <div className="admin-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Tax Summary</h3>
            <span className="badge badge-danger text-xs">20% Rate</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Gross Winnings',    value: totalGross,              color: 'text-white' },
              { label: 'Tax Withheld (20%)',value: taxSummary?.total || totalTax, color: 'text-red-400 font-bold' },
              { label: 'Net Paid Out',      value: totalGross - (taxSummary?.total || totalTax), color: 'text-brand font-bold' },
              { label: 'Winning Bets Count',value: winTickets.length,       color: 'text-gray-300', isMwk: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-admin-surface rounded-xl">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-sm ${item.color}`}>
                  {item.isMwk === false ? item.value.toLocaleString() : fmt.mwk(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending withdrawals */}
      <div className="admin-card mb-6">
        <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            💸 Pending Withdrawals
            {pending.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{pending.length}</span>}
          </h3>
          <a href="/payments" className="text-brand text-xs hover:underline">All payments →</a>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : pending.length === 0 ? (
          <EmptyState icon="✅" title="No pending withdrawals" />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr><th>Customer</th><th>Amount</th><th>Method</th><th>Destination</th><th>Risk</th><th>Requested</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map((w:any) => (
                  <tr key={w.id}>
                    <td>
                      <p className="text-white text-sm font-medium">{w.user_name}</p>
                      <p className="text-gray-600 text-xs font-mono">{w.user_phone}</p>
                    </td>
                    <td className="text-white font-bold text-sm">{fmt.mwk(w.amount)}</td>
                    <td><span className="badge badge-info capitalize">{w.payment_method}</span></td>
                    <td className="text-xs text-gray-400 font-mono">{w.destination}</td>
                    <td>
                      <span className={`text-xs font-bold ${w.risk_score>=70?'text-red-400':w.risk_score>=40?'text-yellow-400':'text-green-400'}`}>
                        {w.risk_score||0}/100
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{fmt.timeAgo(w.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(w.id)}
                          disabled={processing === w.id}
                          className="btn-primary text-xs py-1.5 px-3">
                          {processing === w.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectModal(w)}
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

      {/* Tax records table */}
      <div className="admin-card">
        <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
          <h3 className="text-white font-semibold">Tax Records — Winning Bets</h3>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 px-3">📥 CSV</button>
            <button onClick={exportPDF} className="btn-secondary text-xs py-1.5 px-3">📄 PDF</button>
          </div>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : winTickets.length === 0 ? (
          <EmptyState icon="📋" title="No winning bets yet" subtitle="Tax records appear when bets are settled as won" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr><th>Ticket</th><th>Customer</th><th>Odds</th><th>Gross Win</th><th>Tax (20%)</th><th>Net Paid</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {winTickets.map((t:any) => {
                    const gross = parseFloat(t.potential_win||0);
                    const tax   = parseFloat(t.tax_deducted||0) || gross * TAX_RATE;
                    const net   = parseFloat(t.actual_win||0)   || gross - tax;
                    return (
                      <tr key={t.id}>
                        <td className="font-mono text-brand font-bold text-xs">{t.ticket_code}</td>
                        <td>
                          <p className="text-white text-xs">{t.user_name||'—'}</p>
                          <p className="text-gray-600 text-xs font-mono">{t.user_phone}</p>
                        </td>
                        <td className="text-yellow-400 font-bold">{fmt.odds(t.total_odds)}</td>
                        <td className="text-white">{fmt.mwk(gross)}</td>
                        <td className="text-red-400 font-bold">{fmt.mwk(tax)}</td>
                        <td className="text-brand font-bold">{fmt.mwk(net)}</td>
                        <td className="text-xs text-gray-500">{fmt.datetime(t.settled_at||t.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="px-4 py-3 border-t border-admin-border bg-admin-surface flex items-center justify-end gap-8 text-sm">
              <div className="text-right"><p className="text-xs text-gray-500">Total Gross</p><p className="text-white font-bold">{fmt.mwk(totalGross)}</p></div>
              <div className="text-right"><p className="text-xs text-gray-500">Total Tax</p><p className="text-red-400 font-bold">{fmt.mwk(taxSummary?.total||totalTax)}</p></div>
              <div className="text-right"><p className="text-xs text-gray-500">Net Paid</p><p className="text-brand font-bold">{fmt.mwk(totalGross-(taxSummary?.total||totalTax))}</p></div>
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Withdrawal">
        {rejectModal && (
          <div className="space-y-4">
            <div className="bg-admin-surface rounded-xl p-4">
              <p className="text-white font-medium">{rejectModal.user_name}</p>
              <p className="text-gray-500 text-xs">{rejectModal.user_phone}</p>
              <p className="text-red-400 font-bold mt-2">{fmt.mwk(rejectModal.amount)}</p>
              <p className="text-gray-500 text-xs">via {rejectModal.payment_method} to {rejectModal.destination}</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Rejection reason *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..." rows={3} className="admin-input resize-none" />
            </div>
            <p className="text-xs text-gray-600">Funds will be returned to the customer's wallet automatically.</p>
            <div className="flex gap-2">
              <button onClick={handleReject} disabled={!!processing} className="btn-danger flex-1 py-3">
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-secondary flex-1 py-3">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
