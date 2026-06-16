'use client';

import { useApp } from '@/lib/AppContext';
import { teamStreak } from '@/lib/metrics';
import { formatDate } from '@/types';

export default function TeamStreakBanner() {
  const { ws } = useApp();
  const t = teamStreak(ws);
  const statusStyle =
    t.todayStatus === 'Safe' ? 'bg-green-100 text-green-700' :
    t.todayStatus === 'At Risk' ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-[#DC2626]';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔥</span>
        <div>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">Team Streak: {t.current} Days</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Best {t.best}d · Last success {t.lastSuccessful ? formatDate(t.lastSuccessful) : '—'}
          </div>
        </div>
      </div>
      <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusStyle}`}>{t.todayStatus}</span>
    </div>
  );
}
