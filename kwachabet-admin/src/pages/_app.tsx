import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';

export default function App({ Component, pageProps }: AppProps) {
  const [hydrated, setHydrated] = useState(false);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  useEffect(() => {
    setHasHydrated(true);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
            <span className="text-black font-black text-xl">K</span>
          </div>
          <div className="w-6 h-6 border-2 border-admin-border border-t-brand rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1F2937',
            color: '#F9FAFB',
            border: '1px solid #374151',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00C853', secondary: '#000' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          duration: 4000,
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
