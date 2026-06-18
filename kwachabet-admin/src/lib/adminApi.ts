import axios from 'axios';
import Cookies from 'js-cookie';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const adminApi = axios.create({ baseURL: BASE, timeout: 30000 });

// Attach admin token to every request
adminApi.interceptors.request.use((config) => {
  const token = Cookies.get('kb_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg    = err.response?.data?.error || 'Request failed';
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        Cookies.remove('kb_admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject({ message: msg, status });
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminAuthAPI = {
  login:      (d: any)     => adminApi.post('/admin-auth/login', d),
  getProfile: ()           => adminApi.get('/admin-team/me'),
  getRoles:   ()           => adminApi.get('/admin-team/roles'),
};

// ── Admin Team Management ─────────────────────────────────────────────────────
export const adminTeamAPI = {
  list:       ()           => adminApi.get('/admin-team'),
  create:     (d: any)     => adminApi.post('/admin-team', d),
  update:     (id: string, d: any) => adminApi.patch(`/admin-team/${id}`, d),
  suspend:    (id: string, d: any) => adminApi.patch(`/admin-team/${id}/suspend`, d),
  activate:   (id: string)         => adminApi.patch(`/admin-team/${id}/activate`),
  delete:     (id: string)         => adminApi.delete(`/admin-team/${id}`),
  getLogs:    (p?: any)    => adminApi.get('/admin-team/activity-logs', { params: p }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => adminApi.get('/admin/dashboard/stats'),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customersAPI = {
  list:       (p?: any)    => adminApi.get('/admin/users', { params: p }),
  get:        (id: string) => adminApi.get(`/admin/users/${id}`),
  suspend:    (id: string, reason: string) => adminApi.patch(`/admin/users/${id}/suspend`, { reason }),
  unsuspend:  (id: string) => adminApi.patch(`/admin/users/${id}/unsuspend`),
};

// ── Bets ──────────────────────────────────────────────────────────────────────
export const betsAPI = {
  list:       (p?: any)    => adminApi.get('/admin/tickets', { params: p }),
  transactions: (p?: any)  => adminApi.get('/admin/transactions', { params: p }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  pending:    ()           => adminApi.get('/admin/withdrawals/pending'),
  approve:    (id: string) => adminApi.patch(`/admin/withdrawals/${id}/approve`),
  reject:     (id: string, reason: string) => adminApi.patch(`/admin/withdrawals/${id}/reject`, { reason }),
};

// ── Fraud ─────────────────────────────────────────────────────────────────────
export const fraudAPI = {
  dashboard:   (p?: any)   => adminApi.get('/admin/fraud/dashboard', { params: p }),
  resolve:     (id: string, notes: string) => adminApi.patch(`/admin/fraud/flags/${id}/resolve`, { notes }),
  addNote:     (id: string, d: any) => adminApi.post(`/admin/fraud/flags/${id}/notes`, d),
  createFlag:  (userId: string, d: any) => adminApi.post(`/admin/fraud/flags/${userId}/create`, d),
};

// ── Sports & Odds ─────────────────────────────────────────────────────────────
export const sportsAPI = {
  list:       (p?: any)    => adminApi.get('/admin/events', { params: p }),
  create:     (d: any)     => adminApi.post('/admin/events', d),
  updateOdds: (id: string, d: any) => adminApi.patch(`/admin/events/${id}/odds`, d),
  suspend:    (id: string, d: any) => adminApi.patch(`/admin/events/${id}/suspend`, d),
  setResult:  (id: string, d: any) => adminApi.patch(`/admin/events/${id}/result`, d),
  delete:     (id: string) => adminApi.delete(`/admin/events/${id}`),
};

// ── Tax ───────────────────────────────────────────────────────────────────────
export const taxAPI = {
  summary: () => adminApi.get('/admin/tax/summary'),
  records: (p?: any) => adminApi.get('/admin/tickets', { params: { ...p, status: 'won' } }),
};

// ── Bonus ─────────────────────────────────────────────────────────────────────
export const bonusAPI = {
  campaigns:   ()           => adminApi.get('/admin/bonus/campaigns'),
  assignFreeBet:(d: any)    => adminApi.post('/admin/bonus/free-bet', d),
};

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = {
  mwk:      (n: any) => `MWK ${parseFloat(String(n||0)).toLocaleString('en-MW',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
  num:      (n: any) => parseFloat(String(n||0)).toLocaleString(),
  odds:     (n: any) => parseFloat(String(n||0)).toFixed(2),
  date:     (d: string) => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),
  datetime: (d: string) => new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
  initials: (name: string) => name ? name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) : 'A',
  timeAgo:  (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if (hrs  < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs/24)}d ago`;
  },
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin:      'badge-danger',
  customer_support: 'badge-info',
  fraud_analyst:    'bg-orange-900/40 text-orange-400 border border-orange-800',
  odds_manager:     'badge-success',
  finance_admin:    'badge-purple',
};

export default adminApi;
