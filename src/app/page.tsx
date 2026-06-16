'use client';

import { useState, useRef } from 'react';
import { TabId } from '@/types';
import { useApp } from '@/lib/AppContext';
import { teamStreak } from '@/lib/metrics';
import { exportAll, importAll } from '@/lib/api';
import Login from '@/components/Login';
import TeamStreakBanner from '@/components/TeamStreakBanner';
import TodayTab from '@/components/TodayTab';
import DeadlinesTab from '@/components/DeadlinesTab';
import ProgressTab from '@/components/ProgressTab';

const tabs: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'progress', label: 'Progress' },
];

export default function Home() {
  const { configured, user, ws, loading, logout, refresh } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  if (!configured) return <SetupNotice />;
  if (!user) return <Login />;

  const streak = teamStreak(ws).current;

  const handleExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ali-focus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const res = await importAll(ev.target?.result as string);
      setMsg(res.ok ? 'Imported' : `Failed: ${res.error}`);
      await refresh();
      setTimeout(() => setMsg(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 md:py-8">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Ali Focus</h1>
          <span className="text-sm font-medium text-amber-600 hidden sm:inline">🔥 {streak}d</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 hidden sm:inline mr-1">{user.name}</span>
          <HeaderBtn onClick={handleExport}>Export</HeaderBtn>
          <HeaderBtn onClick={() => fileInputRef.current?.click()}>Import</HeaderBtn>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <HeaderBtn onClick={logout}>Logout</HeaderBtn>
        </div>
      </header>

      {msg && <p className="text-xs text-gray-500 mb-3">{msg}</p>}

      <div className="mb-5"><TeamStreakBanner /></div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400 mb-3">Loading…</p>}
      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'deadlines' && <DeadlinesTab />}
      {activeTab === 'progress' && <ProgressTab />}
    </div>
  );
}

function HeaderBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors"
    >
      {children}
    </button>
  );
}

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-7">
        <h1 className="text-xl font-bold text-gray-900">Ali Focus — setup needed</h1>
        <p className="text-sm text-gray-600 mt-2">Add your Supabase keys to <code className="text-[#2563EB]">.env.local</code>, then restart the dev server:</p>
        <pre className="mt-3 text-xs bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg p-3 overflow-x-auto">{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}</pre>
        <p className="text-sm text-gray-600 mt-3">And run <code className="text-[#2563EB]">supabase/schema.sql</code> in the Supabase SQL editor.</p>
      </div>
    </div>
  );
}
