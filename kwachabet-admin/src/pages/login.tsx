import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:      '🔴 Full system access',
  customer_support: '🔵 Customer management',
  fraud_analyst:    '🟠 Fraud & risk monitoring',
  odds_manager:     '🟢 Sports & odds control',
  finance_admin:    '🟣 Finance & tax reports',
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ phone: '+265', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

 async function handleLogin(e: React.FormEvent) {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const res = await api.post('/admin-auth/login', form);
    const { admin, token } = res.data;
    login(admin, token);
    toast.success(`Welcome back, ${admin.full_name.split(' ')[0]}!`);
    window.location.replace('/');
  } catch (err: any) {
    const msg = err.message || 'Login failed';
    setError(msg);
    toast.error(msg);
  } finally {
    setLoading(false);
  }
}

  return (
    <>
      <Head><title>Admin Login — Kwacha Bet</title></Head>
      <div className="min-h-screen bg-admin-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
                <span className="text-black font-black text-xl">K</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-xl leading-tight">KwachaBet</p>
                <p className="text-brand text-xs font-semibold tracking-wider">ADMIN PANEL</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">Restricted access — authorized personnel only</p>
          </div>

          {/* Login card */}
          <div className="admin-card p-6">
            <h1 className="text-white font-bold text-lg mb-1">Administrator Login</h1>
            <p className="text-gray-500 text-xs mb-5">Enter your admin credentials to continue</p>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-3 mb-4">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+265XXXXXXXXX"
                  required
                  className="admin-input font-mono"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Your admin password"
                    required
                    className="admin-input pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  'Login to Admin Panel'
                )}
              </button>
            </form>
          </div>

          {/* Role descriptions */}
          <div className="admin-card p-4 mt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Available roles:</p>
            <div className="space-y-1">
              {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                <p key={role} className="text-xs text-gray-600">{desc}</p>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-700 mt-4">
            🔒 All admin actions are logged and audited
          </p>

        </div>
      </div>
    </>
  );
}
