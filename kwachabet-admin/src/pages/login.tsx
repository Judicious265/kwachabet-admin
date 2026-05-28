import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ phone: '+265', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      const { user, token } = res.data;
      if (!user.is_admin) {
        toast.error('Access denied. Admin accounts only.');
        return;
      }
      login(user, token);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed.');
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
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
                <span className="text-black font-black text-xl">K</span>
              </div>
              <div className="text-left">
                <p className="text-white font-black text-xl">KwachaBet</p>
                <p className="text-brand text-xs font-semibold">ADMIN PANEL</p>
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h1 className="text-white font-bold text-xl mb-1">Administrator Login</h1>
            <p className="text-gray-500 text-sm mb-6">Restricted access — authorized personnel only</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+265XXXXXXXXX"
                  required
                  className="admin-input font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Your password"
                    required
                    className="admin-input pr-12"
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

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : 'Login to Admin Panel'}
              </button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              🔒 All admin actions are logged and audited
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
