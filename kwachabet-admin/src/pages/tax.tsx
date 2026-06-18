import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import AdminLayout from '../components/layout/AdminLayout';
import { StatCard, TableSkeleton, EmptyState, ExportButtons } from '../components/ui';
import { api, fmt } from '../lib/api';
import { useAdminStore } from '../store/adminStore';
import toast from 'react-hot-toast';

const TAX_RATE = 0.20;

// Generate demo monthly tax data
const generateMonthlyData = () => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((month, i) => ({
    month,
    winnings: Math.floor(Math.random() * 5000000 + 1000000),
    tax:      Math.floor(Math.random() * 1000000 + 200000),
    bets:     Math.floor(Math.random() * 500 + 100),
  }));
};

const generateDailyData = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    tax: Math.floor(Math.random() * 150000 + 20000),
    winnings: Math.floor(Math.random() * 750000 + 100000),
  }));
};

export default function TaxPage() {
  const router = useRouter();
 const { admin, isAuthenticated } = useAdminStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [monthlyData] = useState(generateMonthlyData());
  const [dailyData]   = useState(generateDailyData());

  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) { router.push('/login'); return; }
    load();
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/admin/tickets', { params: { status: 'won', limit: 100 } });
      setTickets(r.data.tickets || []);
    } catch { toast.error('Failed to load tax data'); }
    finally { setLoading(false); }
  }

  // Calculate tax totals
  const totalWinnings = tickets.reduce((a, t) => a + parseFloat(t.potential_win || 0), 0);
  const totalTax      = tickets.reduce((a, t) => a + parseFloat(t.tax_deducted || 0), 0);
  const totalNetPaid  = tickets.reduce((a, t) => a + parseFloat(t.actual_win || 0), 0);
  const winCount      = tickets.length;

  const today = new Date();
  const thisMonth = tickets.filter(t => {
    const d = new Date(t.settled_at || t.created_at);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const monthTax      = thisMonth.reduce((a, t) => a + parseFloat(t.tax_deducted || 0), 0);
  const monthWinnings = thisMonth.reduce((a, t) => a + parseFloat(t.potential_win || 0), 0);

  function exportTaxCSV() {
    const headers = ['Ticket Code','Customer','Gross Win','Tax (20%)','Net Paid','Date Settled'];
    const rows = tickets.map(t => [
      t.ticket_code,
      t.user_name || t.user_phone,
      t.potential_win,
      t.tax_deducted || (parseFloat(t.potential_win || 0) * TAX_RATE).toFixed(2),
      t.actual_win,
      fmt.datetime(t.settled_at || t.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kwachabet_tax_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Tax report exported successfully');
  }

  async function exportTaxPDF() {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Header
      doc.setFillColor(0, 200, 83);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('KWACHA BET', 14, 12);
      doc.setFontSize(11);
      doc.text('WITHHOLDING TAX REPORT', 14, 22);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
      doc.text(`Tax Rate: 20% (Malawi Withholding Tax)`, 14, 44);
      doc.text(`Report Period: All Time`, 14, 50);

      // Summary boxes
      doc.setFillColor(30, 30, 50);
      doc.rect(14, 56, 55, 20, 'F');
      doc.rect(74, 56, 55, 20, 'F');
      doc.rect(134, 56, 62, 20, 'F');

      doc.setTextColor(150, 150, 150);
      doc.setFontSize(7);
      doc.text('TOTAL GROSS WINNINGS', 16, 62);
      doc.text('TOTAL TAX COLLECTED', 76, 62);
      doc.text('TOTAL NET PAID TO CUSTOMERS', 136, 62);

      doc.setTextColor(0, 200, 83);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`MWK ${totalWinnings.toLocaleString()}`, 16, 71);
      doc.setTextColor(239, 68, 68);
      doc.text(`MWK ${totalTax.toLocaleString()}`, 76, 71);
      doc.setTextColor(255, 255, 255);
      doc.text(`MWK ${totalNetPaid.toLocaleString()}`, 136, 71);

      // Table
      autoTable(doc, {
        startY: 84,
        head: [['Ticket Code', 'Customer', 'Gross Win', 'Tax (20%)', 'Net Paid', 'Date']],
        body: tickets.slice(0, 50).map(t => [
          t.ticket_code,
          t.user_name || t.user_phone || '—',
          `MWK ${parseFloat(t.potential_win || 0).toLocaleString()}`,
          `MWK ${parseFloat(t.tax_deducted || 0).toLocaleString()}`,
          `MWK ${parseFloat(t.actual_win || 0).toLocaleString()}`,
          fmt.date(t.settled_at || t.created_at),
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('CONFIDENTIAL — Kwacha Bet Tax Report', 14, 290);
        doc.text(`Page ${i} of ${pageCount}`, 180, 290);
      }

      doc.save(`kwachabet_tax_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF tax report downloaded');
    } catch (err) {
      toast.error('PDF export failed. Try CSV instead.');
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
        <p className="text-gray-400 mb-1 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {fmt.mwk(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <>
      <Head><title>Tax Reports — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Tax Management System">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Gross Winnings" value={totalWinnings} icon="🏆" color="green" format="mwk" sub="All time" />
          <StatCard label="Total Tax Collected" value={totalTax} icon="📋" color="red" format="mwk" sub={`20% withholding tax`} />
          <StatCard label="Net Paid to Customers" value={totalNetPaid} icon="💰" color="blue" format="mwk" sub="After tax deduction" />
          <StatCard label="Winning Bets" value={winCount} icon="🎯" color="yellow" format="number" sub="Settled wins" />
        </div>

        {/* This month */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="admin-card p-4 border-brand/20 bg-brand/5">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">This Month — Tax Collected</p>
            <p className="text-3xl font-black text-brand">{fmt.mwk(monthTax)}</p>
            <p className="text-xs text-gray-500 mt-1">From {fmt.mwk(monthWinnings)} gross winnings · {thisMonth.length} winning bets</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wider">Tax Rate</p>
            <p className="text-3xl font-black text-white">20%</p>
            <p className="text-xs text-gray-500 mt-1">Malawi Withholding Tax on all betting winnings — automatically deducted</p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${period === p ? 'bg-brand text-black' : 'bg-admin-card border border-admin-border text-gray-400 hover:border-gray-500'}`}>
                {p}
              </button>
            ))}
          </div>
          <ExportButtons onCSV={exportTaxCSV} onPDF={exportTaxPDF} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="admin-card p-4">
            <h3 className="text-white font-semibold mb-4">Monthly Tax Collection</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tax" name="Tax Collected" fill="#EF4444" radius={[4,4,0,0]} />
                <Bar dataKey="winnings" name="Gross Winnings" fill="#00C853" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-card p-4">
            <h3 className="text-white font-semibold mb-4">Daily Tax (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="tax" name="Tax" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax records table */}
        <div className="admin-card overflow-hidden">
          <div className="px-4 py-3 border-b border-admin-border flex items-center justify-between">
            <h3 className="text-white font-semibold">Winning Bets — Tax Records</h3>
            <span className="text-xs text-gray-500">{tickets.length} records</span>
          </div>
          {loading ? <TableSkeleton rows={8} cols={6} /> :
           tickets.length === 0 ? (
             <EmptyState icon="📋" title="No winning bets yet" subtitle="Tax records appear here when bets are settled as won" />
           ) : (
             <div className="overflow-x-auto">
               <table className="admin-table">
                 <thead>
                   <tr>
                     <th>Ticket Code</th>
                     <th>Customer</th>
                     <th>Odds</th>
                     <th>Gross Win</th>
                     <th>Tax (20%)</th>
                     <th>Net Paid</th>
                     <th>Date</th>
                   </tr>
                 </thead>
                 <tbody>
                   {tickets.map(t => {
                     const gross = parseFloat(t.potential_win || 0);
                     const tax   = parseFloat(t.tax_deducted || 0) || gross * TAX_RATE;
                     const net   = parseFloat(t.actual_win || 0) || gross - tax;
                     return (
                       <tr key={t.id}>
                         <td className="font-mono text-brand font-bold text-xs">{t.ticket_code}</td>
                         <td>
                           <p className="text-white text-xs">{t.user_name || '—'}</p>
                           <p className="text-gray-600 text-xs font-mono">{t.user_phone}</p>
                         </td>
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
               {/* Totals row */}
               <div className="px-4 py-3 border-t border-admin-border bg-admin-surface flex items-center justify-end gap-8 text-sm">
                 <div className="text-right">
                   <p className="text-xs text-gray-500">Total Gross</p>
                   <p className="text-white font-bold">{fmt.mwk(totalWinnings)}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-gray-500">Total Tax</p>
                   <p className="text-red-400 font-bold">{fmt.mwk(totalTax)}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-gray-500">Total Net Paid</p>
                   <p className="text-brand font-bold">{fmt.mwk(totalNetPaid)}</p>
                 </div>
               </div>
             </div>
           )}
        </div>

      </AdminLayout>
    </>
  );
}
