'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';

export default function PasswordGate() {
  const { needsPassword, submitPassword } = useApp();
  const [value, setValue] = useState('');

  if (!needsPassword) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    submitPassword(value.trim());
    setValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900">Enter sync password</h2>
          <p className="text-sm text-gray-500 mt-1">
            This unlocks your synced data across all devices.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
