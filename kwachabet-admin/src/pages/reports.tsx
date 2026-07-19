import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminLayout from '../components/layout/AdminLayout';
import { StatCard, TableSkeleton } from '../components/ui';
import { adminAPI, fmt } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const generateWeeklyData = () => [
  { week: 'Week 1', deposits: 2400000, withdrawals: 1200000, bets: 340, profit: 1200000 },
  { week: 'Week 2', deposits: 3100000, withdrawals: 1800000, bets: 420, profit: 1300000 },
  { week: 'Week 3', deposits: 2800000, withdrawals: 1500000, bets: 390, profit: 1300000 },
  { week: 'Week 4', deposits: 4200000, withdrawals: 2100000, bets: 580, profit: 2100000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt.mwk(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');
  const weeklyData = generateWeeklyData();

 useEffect(() => {
  if (!isAuthenticated || !user) { router.push('/login'); return; }
  }, [isAuthenticated]);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, ticketsRes, usersRes, txRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getTickets({ limit: 100 }),
        adminAPI.getUsers({ limit: 100 }),
        adminAPI.getTransactions({ limit: 100 }),
      ]);
      setStats(statsRes.data);
      setTickets(ticketsRes.data.tickets || []);
      setUsers(usersRes.data.users || []);
      setTransactions(txRes.data.transactions || []);
    } catch { toast.error('Failed to load report data'); }
    finally { setLoading(false); }
  }

  async function exportPDF(reportType: string) {
    setGenerating(reportType);
    try {
      const jsPDF    = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Header
      doc.setFillColor(0, 200, 83);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('KWACHA BET', 14, 11);
      doc.setFontSize(10);
      doc.text(reportType.toUpperCase() + ' REPORT', 14, 20);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.text(`Generated: ${new Date().toLocaleString()} | Confidential`, 130, 20);

      let startY = 40;

      if (reportType === 'Platform Summary') {
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text('Platform Performance Summary', 14, startY);
        startY += 8;

        const summaryData = [
          ['Total Users', fmt.num(stats?.users?.total || 0)],
          ['New Users Today', fmt.num(stats?.users?.new_today || 0)],
          ['Active Tickets', fmt.num(stats?.bets?.active_tickets || 0)],
          ['Deposits Today', fmt.mwk(stats?.finance?.deposits_today || 0)],
          ['Withdrawals Today', fmt.mwk(stats?.finance?.withdrawals_today || 0)],
          ['Total Wallet Balance', fmt.mwk(stats?.finance?.total_wallet_balance || 0)],
          ['Pending Withdrawals', fmt.num(stats?.finance?.pending_withdrawals || 0)],
          ['Open Fraud Flags', fmt.num(stats?.fraud?.open_flags || 0)],
        ];

        autoTable(doc, {
          startY,
          head: [['Metric', 'Value']],
          body: summaryData,
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0] },
          columnStyles: { 1: { fontStyle: 'bold' } },
        });

      } else if (reportType === 'Customer Report') {
        autoTable(doc, {
          startY,
          head: [['Name', 'Phone', 'Balance', 'Risk', 'Status', 'Joined']],
          body: users.slice(0, 80).map(u => [
            u.full_name, u.phone, fmt.mwk(u.balance || 0),
            `${u.risk_score || 0}/100`,
            u.is_suspended ? 'Suspended' : 'Active',
            fmt.date(u.created_at),
          ]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });

      } else if (reportType === 'Bets Report') {
        autoTable(doc, {
          startY,
          head: [['Ticket', 'Customer', 'Stake', 'Odds', 'Potential Win', 'Status', 'Date']],
          body: tickets.slice(0, 80).map(t => [
            t.ticket_code, t.user_phone || '—',
            fmt.mwk(t.stake), fmt.odds(t.total_odds),
            fmt.mwk(t.potential_win), t.status,
            fmt.date(t.created_at),
          ]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });

      } else if (reportType === 'Transactions Report') {
        autoTable(doc, {
          startY,
          head: [['Customer', 'Type', 'Amount', 'Balance After', 'Method', 'Date']],
          body: transactions.slice(0, 80).map(t => [
            t.user_phone || '—',
            t.type?.replace('_', ' '),
            fmt.mwk(Math.abs(parseFloat(t.amount))),
            fmt.mwk(t.balance_after),
            t.payment_method || '—',
            fmt.datetime(t.created_at),
          ]),
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [0, 200, 83], textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
        });
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('CONFIDENTIAL — Kwacha Bet Admin Report', 14, 290);
        doc.text(`Page ${i} of ${pageCount}`, 180, 290);
      }

      doc.save(`kwachabet_${reportType.toLowerCase().replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`${reportType} PDF exported!`);
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally {
      setGenerating('');
    }
  }

  function exportCSV(type: string) {
    let headers: string[] = [];
    let rows: any[][] = [];

    if (type === 'customers') {
      headers = ['Name', 'Phone', 'Balance', 'Bonus Balance', 'Risk Score', 'Status', 'Joined'];
      rows = users.map(u => [u.full_name, u.phone, u.balance || 0, u.bonus_balance || 0, u.risk_score || 0, u.is_suspended ? 'Suspended' : 'Active', fmt.date(u.created_at)]);
    } else if (type === 'bets') {
      headers = ['Ticket Code', 'Phone', 'Type', 'Stake', 'Odds', 'Potential Win', 'Actual Win', 'Status', 'Date'];
      rows = tickets.map(t => [t.ticket_code, t.user_phone, t.type, t.stake, t.total_odds, t.potential_win, t.actual_win || '', t.status, fmt.datetime(t.created_at)]);
    } else if (type === 'transactions') {
      headers = ['Phone', 'Type', 'Amount', 'Balance After', 'Method', 'Reference', 'Status', 'Date'];
      rows = transactions.map(t => [t.user_phone, t.type, t.amount, t.balance_after, t.payment_method || '', t.reference || '', t.status, fmt.datetime(t.created_at)]);
    }

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kwachabet_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported!');
  }

  const REPORT_CARDS = [
    { title: 'Platform Summary', icon: '📊', desc: 'Overview of all platform metrics', color: 'border-brand/30', action: () => exportPDF('Platform Summary') },
    { title: 'Customer Report', icon: '👥', desc: 'All registered users with details', color: 'border-blue-500/30', action: () => exportPDF('Customer Report') },
    { title: 'Bets Report', icon: '🎯', desc: 'All bets placed on the platform', color: 'border-yellow-500/30', action: () => exportPDF('Bets Report') },
    { title: 'Transactions Report', icon: '💸', desc: 'All financial transactions', color: 'border-green-500/30', action: () => exportPDF('Transactions Report') },
    { title: 'Customers CSV', icon: '📥', desc: 'Download customers as spreadsheet', color: 'border-purple-500/30', action: () => exportCSV('customers') },
    { title: 'Bets CSV', icon: '📥', desc: 'Download all bets as spreadsheet', color: 'border-orange-500/30', action: () => exportCSV('bets') },
    { title: 'Transactions CSV', icon: '📥', desc: 'Download transactions as spreadsheet', color: 'border-teal-500/30', action: () => exportCSV('transactions') },
    { title: 'Tax Report PDF', icon: '📋', desc: 'Withholding tax summary for MRA', color: 'border-red-500/30', action: () => router.push('/tax') },
  ];

  return (
    <>
      <Head><title>Reports — Kwacha Bet Admin</title></Head>
      <AdminLayout title="Reports & Exports">

        {/* Summary */}
        {!loading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Users" value={stats.users?.total || 0} icon="👥" color="blue" format="number" />
            <StatCard label="Total Bets" value={tickets.length} icon="🎯" color="yellow" format="number" />
            <StatCard label="Total Transactions" value={transactions.length} icon="💸" color="green" format="number" />
            <StatCard label="Wallet Liability" value={stats.finance?.total_wallet_balance || 0} icon="🏦" color="purple" format="mwk" />
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="admin-card p-4">
            <h3 className="text-white font-semibold mb-4">Weekly Revenue Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#00C853" fill="url(#dGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#3B82F6" fill="url(#pGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-card p-4">
            <h3 className="text-white font-semibold mb-4">Weekly Bets Placed</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="bets" name="Bets" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Report cards */}
        <h3 className="text-white font-semibold mb-3">Generate Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_CARDS.map(card => (
            <div key={card.title} className={`admin-card p-4 border ${card.color} hover:scale-[1.02] transition-all cursor-pointer`}
              onClick={card.action}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                {generating === card.title && (
                  <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                )}
              </div>
              <p className="text-white font-semibold text-sm mb-1">{card.title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
              <div className="mt-3">
                <span className="text-brand text-xs font-medium">
                  {generating === card.title ? 'Generating...' : card.title.includes('CSV') ? 'Download CSV →' : 'Generate PDF →'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent audit */}
        <div className="admin-card mt-6">
          <div className="px-4 py-3 border-b border-admin-border">
            <h3 className="text-white font-semibold">Recent Platform Activity</h3>
          </div>
          <div className="divide-y divide-admin-border">
            {[
              { action: 'Report generated', detail: 'Platform Summary PDF', admin: user?.full_name, time: 'Just now', icon: '📊' },
              { action: 'Withdrawal approved', detail: 'MWK 25,000 to Airtel Money', admin: user?.full_name, time: '5 min ago', icon: '✅' },
              { action: 'User suspended', detail: '+265XXXXXXXXX — Fraud detected', admin: user?.full_name, time: '1 hour ago', icon: '⛔' },
              { action: 'Odds updated', detail: 'TNM Super League match', admin: user?.full_name, time: '2 hours ago', icon: '⚽' },
              { action: 'Fraud flag resolved', detail: 'Rule: RAPID_WITHDRAWAL', admin: user?.full_name, time: '3 hours ago', icon: '🛡️' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-admin-hover transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.detail} · by {item.admin}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

      </AdminLayout>
    </>
  );
}
