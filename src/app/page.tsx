'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import Login from '@/components/Login';
import MenuDrawer from '@/components/MenuDrawer';
import NotificationBell from '@/components/NotificationBell';
import Home from '@/components/Home';
import DeadlinesTab from '@/components/DeadlinesTab';
import ProgressTab from '@/components/ProgressTab';
import ScreenshotsTab from '@/components/ScreenshotsTab';

export type View = 'home' | 'deadlines' | 'progress' | 'screenshots';

export default function Page() {
  const { configured, user, loading } = useApp();
  const [view, setView] = useState<View>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!configured) return <SetupNotice />;
  if (!user) return <Login />;

  const titles: Record<View, string> = { home: 'Ali Focus', deadlines: 'Deadlines', progress: 'Progress', screenshots: 'Screenshots' };

  return (
    <div className="max-w-xl mx-auto px-4 py-4 md:py-6">
      <header className="flex items-center justify-between mb-5">
        <button onClick={() => setView('home')} className="text-xl font-bold text-gray-900 tracking-tight">{titles[view]}</button>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setMenuOpen(true)} aria-label="Menu"
            className="w-9 h-9 flex items-center justify-center text-gray-600 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      {loading && <p className="text-sm text-gray-400 mb-3">Loading…</p>}
      {view === 'home' && <Home />}
      {view === 'deadlines' && <DeadlinesTab />}
      {view === 'progress' && <ProgressTab />}
      {view === 'screenshots' && <ScreenshotsTab />}

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} view={view} onNavigate={(v) => { setView(v); setMenuOpen(false); }} />
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-7">
        <h1 className="text-xl font-bold text-gray-900">Ali Focus — setup needed</h1>
        <p className="text-sm text-gray-600 mt-2">Add your Supabase keys to <code className="text-orange-600">.env.local</code>, then restart the dev server.</p>
      </div>
    </div>
  );
}
