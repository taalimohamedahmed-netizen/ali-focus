'use client';

import { useRef } from 'react';
import { useApp } from '@/lib/AppContext';
import { getTodayISO } from '@/types';
import { sessionsForDate } from '@/lib/metrics';
import FocusHero from './FocusHero';
import SessionCard from './SessionCard';
import TaskList from './TaskList';

export default function TodayTab() {
  const { ws } = useApp();
  const composerRef = useRef<HTMLInputElement | null>(null);
  const sessions = sessionsForDate(ws, getTodayISO());

  const focusNow = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => composerRef.current?.focus(), 350);
  };

  return (
    <div className="space-y-4 pb-24">
      <FocusHero composerRef={composerRef} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sessions */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-2">Today&apos;s Sessions</h2>
          {sessions.length === 0
            ? <p className="text-sm text-gray-400 py-2">No sessions yet. Hit Start Focus above.</p>
            : <div className="-mx-2">{sessions.map(s => <SessionCard key={s.id} session={s} />)}</div>}
        </div>

        {/* Tasks */}
        <TaskList />
      </div>

      {/* Floating Focus Now */}
      <button
        onClick={focusNow}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-6 py-3 text-sm font-bold text-white bg-orange-600 rounded-full shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition-colors flex items-center gap-2"
      >
        ▶ Focus Now
      </button>
    </div>
  );
}
