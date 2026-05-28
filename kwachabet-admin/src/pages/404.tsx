import Head from 'next/head';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <Head><title>404 — Kwacha Bet Admin</title></Head>
      <div className="min-h-screen bg-admin-bg flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-admin-card border border-admin-border rounded-2xl flex items-center justify-center mb-6">
          <span className="text-3xl">🔍</span>
        </div>
        <p className="text-6xl font-black text-brand mb-3">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-xs">The admin page you are looking for does not exist or you do not have permission to access it.</p>
        <div className="flex gap-3">
          <Link href="/" className="btn-primary px-6 py-3">← Dashboard</Link>
          <Link href="/login" className="btn-secondary px-6 py-3">Login</Link>
        </div>
      </div>
    </>
  );
}
