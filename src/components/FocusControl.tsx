'use client';

// Live-clock + audio control. Reads Date.now() in render for the timer.
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getTodayISO, Session } from '@/types';
import { sessionsForDate, liveSessionMinutes } from '@/lib/metrics';
import {
  ensureTodayPlan, startNewSession, pauseSession, finishSession, resumeSession,
} from '@/lib/api';
import { emitProgressEvents } from '@/lib/milestones';
import { playSound } from '@/lib/sound';

const TIME_OPTIONS = [15, 25, 30, 45, 60, 90, 120];
const CUSTOM_BREAKS = [5, 10, 15, 20];

function mmss(min: number): string {
  const s = Math.max(0, Math.round(min * 60));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function FocusControl() {
  const { ws, user, refresh, tick } = useApp();
  const today = getTodayISO();
  const mine = sessionsForDate(ws, today).filter(s => s.started_by === user?.id);
  const running = mine.find(s => s.status === 'running') ?? null;
  const paused = mine.filter(s => s.status === 'paused');

  const [title, setTitle] = useState('');
  const [est, setEst] = useState(60);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const [breakDone, setBreakDone] = useState(false);
  const [endModal, setEndModal] = useState<Session | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (breakEndsAt && Date.now() >= breakEndsAt) {
      setBreakEndsAt(null);
      setBreakDone(true);
      playSound('break_finished');
    }
  }, [tick, breakEndsAt]);

  if (!user) return null;
  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const start = async () => {
    let plan = ws.dayPlans.find(p => p.work_date === today) ?? null;
    if (!plan) plan = await ensureTodayPlan(0, user.id);
    if (!plan) return;
    await startNewSession(plan.id, title, est, user.id);
    setTitle('');
    await refresh();
  };

  const pause = async (s: Session) => {
    await pauseSession(s, user.id);
    await refresh();
    await emitProgressEvents(user);
    await refresh();
  };

  const finish = async (s: Session) => {
    await finishSession(s, user.id);
    await refresh();
    playSound('session_finished');
    const r = await emitProgressEvents(user);
    if (r.commitmentCompleted) playSound('commitment_completed');
    await refresh();
    setEndModal(s);
  };

  const startBreak = (min: number) => {
    setBreakEndsAt(Date.now() + min * 60000);
    setEndModal(null);
    setCustomOpen(false);
    setBreakDone(false);
  };

  // ---- break running ----
  if (breakEndsAt) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-gray-500 mb-1">☕ Break</p>
        <p className="text-5xl font-bold text-green-600 tabular-nums">{mmss((breakEndsAt - Date.now()) / 60000)}</p>
        <button onClick={() => { setBreakEndsAt(null); setBreakDone(false); }} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Skip break</button>
      </div>
    );
  }

  // ---- break finished prompt ----
  if (breakDone) {
    return (
      <div className="text-center py-3">
        <p className="text-base font-semibold text-gray-900">Break finished.</p>
        <p className="text-sm text-gray-500 mb-3">Ready for the next session?</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => setBreakDone(false)} className="px-5 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Start next session</button>
          <button onClick={() => startBreak(5)} className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">Extend 5 min</button>
        </div>
      </div>
    );
  }

  // ---- running ----
  if (running) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-500">Focusing on</p>
        <p className="text-lg font-bold text-gray-900 truncate">{running.title}</p>
        <p className="text-6xl font-bold text-gray-900 tabular-nums my-1">{mmss(liveSessionMinutes(running))}</p>
        <p className="text-xs text-gray-400 mb-4">of {running.duration_minutes}m</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => pause(running)} className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">Pause</button>
          <button onClick={() => finish(running)} className="px-8 py-3 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Finish</button>
        </div>
        {endModal && <EndModal name={user.name} onBreak={startBreak} onCustom={() => setCustomOpen(true)} onClose={() => setEndModal(null)} custom={customOpen} />}
      </div>
    );
  }

  // ---- idle composer ----
  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && start()}
        placeholder="What are you working on?"
        className="w-full px-4 py-3 text-base border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      />
      <div className="flex gap-2">
        <select value={est} onChange={e => setEst(Number(e.target.value))} className="px-3 py-3 text-sm border border-[#E5E7EB] rounded-xl bg-white focus:outline-none focus:border-orange-500">
          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}m</option>)}
        </select>
        <button onClick={start} className="flex-1 py-3 text-base font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 shadow-sm">▶ Start Focus Session</button>
      </div>
      {paused.map(s => (
        <button key={s.id} onClick={() => act(() => resumeSession(s, user.id))}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-orange-50 text-orange-800 rounded-xl hover:bg-orange-100">
          <span className="truncate">Resume “{s.title}”</span><span className="font-semibold">▶</span>
        </button>
      ))}
      {endModal && <EndModal name={user.name} onBreak={startBreak} onCustom={() => setCustomOpen(true)} onClose={() => setEndModal(null)} custom={customOpen} />}
    </div>
  );
}

function EndModal({ name, onBreak, onCustom, onClose, custom }: {
  name: string; onBreak: (m: number) => void; onCustom: () => void; onClose: () => void; custom: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
        <p className="text-3xl mb-1">🔥</p>
        <h3 className="font-bold text-gray-900">Nice work, {name}</h3>
        <p className="text-sm text-gray-500 mt-0.5 mb-4">You finished this session. What next?</p>
        {!custom ? (
          <div className="space-y-2">
            <button onClick={() => onBreak(10)} className="w-full py-2.5 text-sm font-semibold text-green-700 bg-green-100 rounded-xl hover:bg-green-200">Take 10 min break</button>
            <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Continue working</button>
            <button onClick={onCustom} className="w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">Custom break</button>
            <button onClick={onClose} className="w-full py-2 text-sm font-medium text-gray-400 hover:text-gray-600">End for now</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {CUSTOM_BREAKS.map(m => (
              <button key={m} onClick={() => onBreak(m)} className="py-2.5 text-sm font-semibold text-gray-700 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">{m} min</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
