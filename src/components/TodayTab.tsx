'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getTodayISO } from '@/types';
import { ensureTodayPlan, addSession } from '@/lib/api';
import SessionCard from './SessionCard';
import TodayProgress from './TodayProgress';
import TaskList from './TaskList';
import NotesBox from './NotesBox';
import ProjectsManager from './ProjectsManager';

export default function TodayTab() {
  const { ws, user, refresh } = useApp();
  const today = getTodayISO();
  const plan = ws.dayPlans.find(p => p.work_date === today) ?? null;
  const sessions = plan ? ws.sessions.filter(s => s.day_plan_id === plan.id) : [];

  const [hours, setHours] = useState(plan ? String(plan.target_minutes / 60) : '');
  const [sTitle, setSTitle] = useState('');
  const [sMin, setSMin] = useState('');

  if (!user) return null;
  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const saveTarget = () => {
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0) return;
    act(() => ensureTodayPlan(Math.round(h * 60), user.id).then(() => {}));
  };

  const createSession = async () => {
    const min = parseInt(sMin, 10);
    if (!sTitle.trim() || isNaN(min) || min <= 0) return;
    let p = plan;
    if (!p) p = await ensureTodayPlan(0, user.id);
    if (!p) return;
    await addSession(p.id, sTitle, min);
    setSTitle(''); setSMin('');
    await refresh();
  };

  return (
    <div className="space-y-5">
      {/* Plan setup */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Today&apos;s Plan</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Daily target (hours)</label>
            <input
              type="number" min="0" step="0.5" value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. 6"
              className="w-32 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <button onClick={saveTarget} className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700">
            {plan ? 'Update target' : 'Save plan'}
          </button>
          <span className="text-sm text-gray-400">{sessions.length} session{sessions.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Progress */}
      <TodayProgress />

      {/* Sessions */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Sessions</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={sTitle}
            onChange={e => setSTitle(e.target.value)}
            placeholder="Session title"
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
          />
          <input
            type="number" min="1" value={sMin}
            onChange={e => setSMin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSession()}
            placeholder="Min"
            className="w-24 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
          />
          <button onClick={createSession} className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700">Add session</button>
        </div>
        {sessions.length === 0
          ? <p className="text-sm text-gray-400">No sessions yet. Add one above.</p>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}
      </div>

      {/* Tasks */}
      <TaskList />

      {/* Projects + Notes */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Projects</h2>
        <ProjectsManager />
      </div>
      <NotesBox />
    </div>
  );
}
