'use client';

// Live-clock component: reads Date.now() during render for the running timer
// and updates state from a tick-driven effect when a session reaches its time.
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getTodayISO, formatMinutes, Session } from '@/types';
import {
  teamStreak, sessionsForDate, completedMinutesForDate, targetMinutesForDate,
  dailyScore, liveSessionMinutes,
} from '@/lib/metrics';
import {
  ensureTodayPlan, startNewSession, pauseSession, finishSession, resumeSession,
} from '@/lib/api';
import { playChime } from '@/lib/sound';

const TIME_OPTIONS = [15, 25, 30, 45, 60, 90, 120];

function mmss(totalMin: number): string {
  const s = Math.max(0, Math.round(totalMin * 60));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function FocusHero({ composerRef }: { composerRef?: React.RefObject<HTMLInputElement | null> }) {
  const { ws, user, refresh, tick } = useApp();
  const today = getTodayISO();

  const sessions = sessionsForDate(ws, today);
  const running = sessions.find(s => s.status === 'running') ?? null;
  const goal = targetMinutesForDate(ws, today);
  const worked = completedMinutesForDate(ws, today);
  const remaining = Math.max(0, goal - worked);
  const doneCount = sessions.filter(s => s.status === 'completed').length;
  const pct = goal > 0 ? Math.min(100, Math.round((worked / goal) * 100)) : 0;
  const team = teamStreak(ws);
  const score = dailyScore(ws, today);

  const [title, setTitle] = useState('');
  const [est, setEst] = useState(60);
  const [breakFor, setBreakFor] = useState<Session | null>(null);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const notified = useRef<Set<string>>(new Set());

  // detect session reaching its estimate → chime + offer break
  useEffect(() => {
    if (running) {
      const live = liveSessionMinutes(running);
      if (live >= running.duration_minutes && !notified.current.has(running.id)) {
        notified.current.add(running.id);
        playChime();
        setBreakFor(running);
      }
    }
    if (breakEndsAt && Date.now() >= breakEndsAt) {
      setBreakEndsAt(null);
      playChime();
    }
  }, [tick, running, breakEndsAt]);

  if (!user) return null;
  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const start = async () => {
    let plan = ws.dayPlans.find(p => p.work_date === today) ?? null;
    if (!plan) plan = await ensureTodayPlan(goal, user.id);
    if (!plan) return;
    await startNewSession(plan.id, title, est, user.id);
    setTitle('');
    await refresh();
  };

  const setGoalHours = (h: number) => act(() => ensureTodayPlan(Math.round(h * 60), user.id).then(() => {}));

  const statusChip =
    team.todayStatus === 'Safe' ? 'bg-green-100 text-green-700'
      : 'bg-orange-100 text-orange-700';

  return (
    <div className="rounded-3xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* streak strip */}
      <div className="flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold text-gray-900">Team Streak: {team.current} {team.current === 1 ? 'Day' : 'Days'}</span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusChip}`}>{team.todayStatus}</span>
      </div>

      {/* stat row */}
      <div className="grid grid-cols-4 gap-2 px-6 py-4">
        <Stat icon="🎯" label="Goal" value={
          <GoalPicker hours={goal / 60} onPick={setGoalHours} />
        } />
        <Stat icon="⏱" label="Worked" value={formatMinutes(worked)} />
        <Stat icon="📈" label="Left" value={goal > 0 ? formatMinutes(remaining) : '—'} />
        <Stat icon="🏆" label="Score" value={`${score}`} />
      </div>

      {/* progress bar */}
      <div className="h-1.5 bg-gray-100 mx-6 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* live control OR composer */}
      <div className="p-6">
        {breakEndsAt ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-1">Break</p>
            <p className="text-5xl font-bold text-green-600 tabular-nums">{mmss((breakEndsAt - Date.now()) / 60000)}</p>
            <button onClick={() => setBreakEndsAt(null)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Skip break</button>
          </div>
        ) : running ? (
          <div className="text-center">
            <p className="text-sm text-gray-500">Focusing on</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5 mb-2 truncate">{running.title}</p>
            <p className="text-6xl font-bold text-gray-900 tabular-nums mb-1">{mmss(liveSessionMinutes(running))}</p>
            <p className="text-xs text-gray-400 mb-5">of {running.duration_minutes}m</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => act(() => pauseSession(running, user.id))}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">Pause</button>
              <button onClick={() => act(() => finishSession(running, user.id))}
                className="px-8 py-3 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Finish</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={composerRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && start()}
              placeholder="What are you working on?"
              className="w-full px-4 py-3 text-base border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="flex gap-2">
              <select value={est} onChange={e => setEst(Number(e.target.value))}
                className="px-3 py-3 text-sm border border-[#E5E7EB] rounded-xl bg-white focus:outline-none focus:border-orange-500">
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}m</option>)}
              </select>
              <button onClick={start}
                className="flex-1 py-3 text-base font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors shadow-sm">
                ▶ Start Focus Session
              </button>
            </div>
            {/* paused sessions quick-resume */}
            {sessions.filter(s => s.status === 'paused').map(s => (
              <button key={s.id} onClick={() => act(() => resumeSession(s, user.id))}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-orange-50 text-orange-800 rounded-xl hover:bg-orange-100">
                <span className="truncate">Resume “{s.title}” · {formatMinutes(s.completed_minutes)}/{s.duration_minutes}m</span>
                <span className="font-semibold">▶</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-center text-xs text-gray-400 mt-4">{doneCount} done · {sessions.length} total today</p>
      </div>

      {/* break prompt */}
      {breakFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setBreakFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-2">🎉</p>
            <h3 className="font-bold text-gray-900">Session done!</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">“{breakFor.title}” reached {breakFor.duration_minutes}m. Break or keep going?</p>
            <div className="space-y-2">
              <button onClick={async () => { await act(() => finishSession(breakFor, user.id)); setBreakEndsAt(Date.now() + 5 * 60000); setBreakFor(null); }}
                className="w-full py-2.5 text-sm font-semibold text-green-700 bg-green-100 rounded-xl hover:bg-green-200">Take a 5-min break</button>
              <button onClick={async () => { await act(() => finishSession(breakFor, user.id)); setBreakFor(null); }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Finish & start next</button>
              <button onClick={() => setBreakFor(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">Keep going</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-base">{icon}</div>
      <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

function GoalPicker({ hours, onPick }: { hours: number; onPick: (h: number) => void }) {
  return (
    <select
      value={hours}
      onChange={e => onPick(Number(e.target.value))}
      className="text-sm font-bold text-gray-900 bg-transparent focus:outline-none cursor-pointer text-center"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(h => (
        <option key={h} value={h}>{h}h</option>
      ))}
    </select>
  );
}
