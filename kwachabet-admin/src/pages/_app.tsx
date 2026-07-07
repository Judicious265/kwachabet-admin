import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Signal zustand store that client has hydrated
    try {
      const { useAuthStore } = require('../store/auth');
      useAuthStore.getState().setHasHydrated(true);
    } catch (e) {}
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0F1E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: 40, height: 40,
          background: '#00C853',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 20,
          color: '#000',
        }}>K</div>
        <div style={{
          width: 24, height: 24,
          border: '2px solid #374151',
          borderTopColor: '#00C853',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background:   '#1F2937',
            color:        '#F9FAFB',
            border:       '1px solid #374151',
            borderRadius: '12px',
            fontSize:     '14px',
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
