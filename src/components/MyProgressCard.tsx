'use client';

import { useApp } from '@/lib/AppContext';
import { getTodayISO, formatMinutes } from '@/types';
import {
  userWorkedMinutes, userCommittedMinutes, userSessionCount, userTaskStats,
  userTodayScore, userWeeklyScore, userMissingMinutes, penaltyPoints, userStatus,
} from '@/lib/metrics';
import FocusControl from './FocusControl';

export default function MyProgressCard() {
  const { ws, user } = useApp();
  if (!user) return null;
  const today = getTodayISO();

  const worked = userWorkedMinutes(ws, user.id, today);
  const committed = userCommittedMinutes(ws, user.id, today);
  const sessions = userSessionCount(ws, user.id, today);
  const tasks = userTaskStats(ws, user.id, today);
  const todayScore = userTodayScore(ws, user.id, today);
  const weekly = userWeeklyScore(ws, user.id);
  const missing = userMissingMinutes(ws, user.id, today);
  const penalty = penaltyPoints(missing);
  const status = userStatus(ws, user.id, today);

  const statusStyle = status === 'Safe' ? 'bg-green-100 text-green-700'
    : status === 'At Risk' ? 'bg-orange-100 text-orange-700'
      : 'bg-gray-100 text-gray-500';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 text-lg">{user.name} Today</h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle}`}>{status}</span>
      </div>

      {/* the engine */}
      <FocusControl />

      {/* personal stats */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 text-center">
        <Stat value={`${sessions}`} label="Sessions" />
        <Stat value={committed != null ? `${formatMinutes(worked)} / ${formatMinutes(committed)}` : formatMinutes(worked)} label="Worked" />
        <Stat value={`${tasks.done}/${tasks.total}`} label="Tasks" />
        <Stat value={`${todayScore}`} label="Today pts" accent />
        <Stat value={`${weekly}`} label="Weekly pts" accent />
        <Stat value={missing > 0 ? formatMinutes(missing) : '—'} label="Missing" />
      </div>

      {committed != null && missing > 0 && (
        <div className="mt-3 flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2">
          <span className="text-xs text-orange-700">Penalty preview (if day ends now)</span>
          <span className="text-sm font-bold text-orange-700">-{penalty} weekly</span>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-xl font-bold ${accent ? 'text-orange-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}
