import axios from 'axios';
import Cookies from 'js-cookie';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = Cookies.get('kb_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('kb_admin_token');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject({ message: err.response?.data?.error || 'Request failed', status: err.response?.status });
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (d: any) => api.post('/auth/login', d),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard:          ()        => api.get('/admin/dashboard/stats'),
  getUsers:              (p?: any) => api.get('/admin/users', { params: p }),
  getUserDetail:         (id: string) => api.get(`/admin/users/${id}`),
  suspendUser:           (id: string, reason: string) => api.patch(`/admin/users/${id}/suspend`, { reason }),
  unsuspendUser:         (id: string) => api.patch(`/admin/users/${id}/unsuspend`),
  getTickets:            (p?: any) => api.get('/admin/tickets', { params: p }),
  getTransactions:       (p?: any) => api.get('/admin/transactions', { params: p }),
  getPendingWithdrawals: ()        => api.get('/admin/withdrawals/pending'),
  approveWithdrawal:     (id: string) => api.patch(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal:      (id: string, reason: string) => api.patch(`/admin/withdrawals/${id}/reject`, { reason }),
  getFraudDashboard:     (p?: any) => api.get('/admin/fraud/dashboard', { params: p }),
  resolveFraudFlag:      (id: string, notes: string) => api.patch(`/admin/fraud/flags/${id}/resolve`, { notes }),
  getCampaigns:          ()        => api.get('/admin/bonus/campaigns'),
  assignFreeBet:         (d: any)  => api.post('/admin/bonus/free-bet', d),
};

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = {
  mwk: (n: number | string) =>
    `MWK ${parseFloat(String(n || 0)).toLocaleString('en-MW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  num:  (n: number | string) => parseFloat(String(n || 0)).toLocaleString(),
  odds: (n: number | string) => parseFloat(String(n || 0)).toFixed(2),
  date: (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  datetime: (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
  initials: (name: string) => name ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
  pct: (n: number) => `${parseFloat(String(n || 0)).toFixed(1)}%`,
};

export const RISK_COLOR = (score: number) => {
  if (score >= 70) return 'text-red-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-green-400';
};

export const RISK_LABEL = (score: number) => {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Medium Risk';
  return 'Low Risk';
};

export const STATUS_BADGE: Record<string, string> = {
  active:     'badge-success',
  completed:  'badge-success',
  won:        'badge-success',
  pending:    'badge-warning',
  processing: 'badge-warning',
  flagged:    'badge-danger',
  suspended:  'badge-danger',
  lost:       'badge-danger',
  cancelled:  'badge-gray',
  failed:     'badge-danger',
};
