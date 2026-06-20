'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { useToast } from '@/lib/toast';

export default function Login() {
  const { login } = useApp();
  const toast = useToast();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await login(name, password);
    if (!res.ok) { setError(res.error ?? 'Login failed'); toast(res.error ?? 'Login failed', 'error'); }
    else toast(`Signed in as ${name.trim()} ✓`, 'success');
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-7">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ali Focus</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Shared team workspace. New name = new account.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            autoFocus
            className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C]"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full px-3.5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C]"
          />
          {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#EA580C] rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
