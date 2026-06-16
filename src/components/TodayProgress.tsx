'use client';

import { useApp } from '@/lib/AppContext';
import { getTodayISO, formatMinutes } from '@/types';
import {
  sessionsForDate, completedMinutesForDate, targetMinutesForDate,
} from '@/lib/metrics';

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-2xl md:text-3xl font-bold ${accent ? 'text-[#2563EB]' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function TodayProgress() {
  const { ws } = useApp();
  const today = getTodayISO();
  const target = targetMinutesForDate(ws, today);
  const completed = completedMinutesForDate(ws, today);
  const sessions = sessionsForDate(ws, today);
  const doneSessions = sessions.filter(s => s.status === 'completed').length;
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Today&apos;s Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat value={formatMinutes(target)} label="Target" />
        <Stat value={formatMinutes(completed)} label="Completed" />
        <Stat value={`${doneSessions}/${sessions.length}`} label="Sessions" />
        <Stat value={`${pct}%`} label="Completion" accent />
      </div>
      <div className="h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
        <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
