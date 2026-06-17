'use client';

import { useApp } from '@/lib/AppContext';
import { formatMinutes } from '@/types';
import { teamRows } from '@/lib/metrics';

export default function TeamScoreCard() {
  const { ws, user } = useApp();
  const rows = teamRows(ws);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
      <h2 className="font-bold text-gray-900 text-lg mb-3">Team Score 🏅</h2>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-sm text-gray-400">No teammates yet.</p>}
        {rows.map((r, i) => {
          const dot = r.status === 'Safe' ? 'bg-green-500' : r.status === 'At Risk' ? 'bg-orange-500' : 'bg-gray-300';
          return (
            <div key={r.userId}
              className={`flex items-center gap-3 px-2 py-2 rounded-xl ${r.userId === user?.id ? 'bg-orange-50' : ''}`}>
              <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
              <span className="flex-1 min-w-0 font-semibold text-gray-900 truncate">{r.name}</span>
              <span className="text-sm text-gray-500 w-14 text-right">{formatMinutes(r.workedMinutes)}</span>
              <span className="text-sm font-semibold text-gray-700 w-12 text-right">{r.todayScore}<span className="text-[10px] text-gray-400"> today</span></span>
              <span className="text-sm font-bold text-orange-600 w-14 text-right">{r.weeklyScore}<span className="text-[10px] text-gray-400"> wk</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
