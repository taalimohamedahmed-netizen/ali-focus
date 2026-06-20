'use client';

// Tiny global toast: surfaces success/error so writes never fail silently.
import { createContext, useContext, useState, useCallback } from 'react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; msg: string; kind: Kind }

const ToastContext = createContext<((msg: string, kind?: Kind) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto max-w-sm w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg ${
              t.kind === 'error' ? 'bg-red-600 text-white'
                : t.kind === 'success' ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-white'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
