'use client';

import { useState } from 'react';
import { TabId } from '@/types';
import { useApp } from '@/lib/AppContext';
import { teamStreak } from '@/lib/metrics';
import Login from '@/components/Login';
import MenuDrawer from '@/components/MenuDrawer';
import TodayTab from '@/components/TodayTab';
import DeadlinesTab from '@/components/DeadlinesTab';
import ProgressTab from '@/components/ProgressTab';

const tabs: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'deadlines', label: 'Deadlines' },
  { id: 'progress', label: 'Progress' },
];

export default function Home() {
  const { configured, user, ws, loading } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!configured) return <SetupNotice />;
  if (!user) return <Login />;

  const streak = teamStreak(ws).current;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-6">
      <header className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Ali Focus</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-orange-600 px-2.5 py-1 bg-orange-50 rounded-full">🔥 {streak}</span>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
            className="w-9 h-9 flex items-center justify-center text-gray-600 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
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

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-7">
        <h1 className="text-xl font-bold text-gray-900">Ali Focus — setup needed</h1>
        <p className="text-sm text-gray-600 mt-2">Add your Supabase keys to <code className="text-orange-600">.env.local</code>, then restart the dev server:</p>
        <pre className="mt-3 text-xs bg-[#F5F7FA] border border-[#E5E7EB] rounded-lg p-3 overflow-x-auto">{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}</pre>
        <p className="text-sm text-gray-600 mt-3">And run <code className="text-orange-600">supabase/schema.sql</code> in the Supabase SQL editor.</p>
      </div>
    </div>
  );
}
