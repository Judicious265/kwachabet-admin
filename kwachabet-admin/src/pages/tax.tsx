import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../components/layout/AdminLayout';
import { StatCard, TableSkeleton, EmptyState, ExportButtons } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const TAX_RATE = 0.20;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {fmt.mwk(p.value)}</p>
      ))}
    </div>
  );
};

export default function TaxPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    load();
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    try {
      const r = await adminAPI.getTickets({ status: 'won', limit: 100 });
      setTickets(r.data.tickets || []);
    } catch { toast.error('Failed to load tax data'); }
    finally { setLoading(false); }
  }

  const totalWinnings = tickets.reduce((a, t) => a + parseFloat(t.potential_win || 0), 0);
  const totalTax      = tickets.reduce((a, t) => a + parseFloat(t.tax_deducted || 0), 0);
  const totalNetPaid  = tickets.reduce((a, t) => a + parseFloat(t.actual_win || 0), 0);

  const today     = new Date(); today.setHours(0,0,0,0);
  const monthStart= new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonth = tickets.filter(t => new Date(t.settled_at || t.created_at) >= monthStart);
  const monthTax      = thisMonth.reduce((a, t) => a + parseFloat(t.tax_deducted || 0), 0);
  const monthWinnings = thisMonth.reduce((a, t) => a + parseFloat(t.potential_win || 0), 0);

  // Build chart data from real tickets grouped by day
  const dayMap: Record<string, { winnings: number; tax: number }> = {};
  tickets.forEach(t => {
    const day = fmt.date(t.settled_at || t.created_at);
    if (!dayMap[day]) dayMap[day] = { winnings: 0, tax: 0 };
    dayMap[day].winnings += parseFloat(t.potential_win || 0);
    dayMap[day].tax      += parseFloat(t.tax_deducted || 0) || parseFloat(t.potential_win || 0) * TAX_RATE;
  });
  const chartData = Object.entries(dayMap).slice(-14).map(([day, v]) => ({ day, ...v }));

  async function exportCSV() {
    const headers = ['Ticket Code', 'Customer', 'Gross Win', 'Tax (20%)', 'Net Paid', 'Date Settled'];
    const rows = tickets.map(t => [
      t.ticket_code, t.user_name || t.user_phone,
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
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('KWACHA BET', 14, 11);
      doc.setFontSize(10);
      doc.text('WITHHOLDING TAX REPORT — 20%', 14, 20);
      doc.setTextColor(100, 100, 100); doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()} by ${user?.full_name}`, 14, 36);
      autoTable(doc, {
        startY: 45,
        head: [['Ticket', 'Customer', 'Gross Win', 'Tax (20%)', 'Net Paid', 'Date']],
        body: tickets.slice(0, 80).map(t => {
          const gross = parseFloat(t.potential_win || 0);
          const tax   = parseFloat(t.tax_deducted || 0) || gross * TAX_RATE;
          return [t.ticket_code, t.user_name || t.user_phone, fmt.mwk(gross), fmt.mwk(tax), fmt.mwk(gross - tax), fmt.date(t.settled_at || t.created_at)];
        }),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
      doc.save(`kwachabet_tax_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded');
    } catch { toast.error('PDF export failed — try CSV'); }
  }

  return (
    <>
      <Head><title>Tax Reports — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Tax Management System">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Gross Winnings" value={totalWinnings} icon="🏆" color="green"  format="mwk" sub="All winning bets" />
          <StatCard label="Total Tax Collected"  value={totalTax}      icon="📋" color="red"    format="mwk" sub="20% withheld" />
          <StatCard label="Net Paid to Customers"value={totalNetPaid}  icon="💰" color="blue"   format="mwk" sub="After tax" />
          <StatCard label="Winning Bets"         value={tickets.length}icon="🎯" color="yellow" format="number" sub="Settled wins" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="admin-card p-4 border-brand/20 bg-brand/5">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">This Month — Tax Collected</p>
            <p className="text-3xl font-black text-brand">{fmt.mwk(monthTax)}</p>
            <p className="text-xs text-gray-500 mt-1">From {fmt.mwk(monthWinnings)} gross · {thisMonth.length} winning bets</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Tax Rate</p>
            <p className="text-3xl font-black text-white">20%</p>
            <p className="text-xs text-gray-500 mt-1">Malawi Withholding Tax — automatically deducted from all winnings</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Tax Records</h3>
          <ExportButtons onCSV={exportCSV} onPDF={exportPDF} />
        </div>

        {chartData.length > 0 && (
          <div className="admin-card p-4 mb-5">
            <h3 className="text-white font-semibold mb-4">Daily Tax Collection (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tax"      name="Tax Collected"  fill="#EF4444" radius={[4,4,0,0]} />
                <Bar dataKey="winnings" name="Gross Winnings" fill="#00C853" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="admin-card overflow-hidden">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold">Winning Bets — Tax Records</h3>
            <span className="text-xs text-gray-500">{tickets.length} records</span>
          </div>
          {loading ? <TableSkeleton rows={8} cols={6} /> :
           tickets.length === 0 ? <EmptyState icon="📋" title="No winning bets yet" subtitle="Tax records appear when bets are settled as won" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead><tr><th>Ticket</th><th>Customer</th><th>Odds</th><th>Gross Win</th><th>Tax (20%)</th><th>Net Paid</th><th>Date</th></tr></thead>
                  <tbody>
                    {tickets.map(t => {
                      const gross = parseFloat(t.potential_win || 0);
                      const tax   = parseFloat(t.tax_deducted || 0) || gross * TAX_RATE;
                      const net   = parseFloat(t.actual_win || 0) || gross - tax;
                      return (
                        <tr key={t.id}>
                          <td className="font-mono text-brand font-bold text-xs">{t.ticket_code}</td>
                          <td><p className="text-white text-xs">{t.user_name || '—'}</p><p className="text-gray-600 text-xs font-mono">{t.user_phone}</p></td>
                          <td className="text-yellow-400 font-bold">{fmt.odds(t.total_odds)}</td>
                          <td className="text-white font-medium">{fmt.mwk(gross)}</td>
                          <td className="text-red-400 font-bold">{fmt.mwk(tax)}</td>
                          <td className="text-brand font-bold">{fmt.mwk(net)}</td>
                          <td className="text-xs text-gray-500">{fmt.datetime(t.settled_at || t.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-admin-border bg-admin-surface flex items-center justify-end gap-8 text-sm">
                <div className="text-right"><p className="text-xs text-gray-500">Total Gross</p><p className="text-white font-bold">{fmt.mwk(totalWinnings)}</p></div>
                <div className="text-right"><p className="text-xs text-gray-500">Total Tax</p><p className="text-red-400 font-bold">{fmt.mwk(totalTax)}</p></div>
                <div className="text-right"><p className="text-xs text-gray-500">Net Paid</p><p className="text-brand font-bold">{fmt.mwk(totalNetPaid)}</p></div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
