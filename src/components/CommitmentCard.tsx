'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { useToast } from '@/lib/toast';
import { getTodayISO, formatMinutes } from '@/types';
import { userCommitment } from '@/lib/metrics';
import {
  createCommitment, increaseCommitment, ensureTodayPlan,
  addTask, completeTask, deleteTask, updateTaskTitle, notify,
} from '@/lib/api';

export default function CommitmentCard() {
  const { ws, user, refresh } = useApp();
  const toast = useToast();
  const today = getTodayISO();
  const commitment = user ? userCommitment(ws, user.id, today) : null;
  const myTasks = ws.tasks.filter(t => t.work_date === today && t.created_by === user?.id);

  const [hours, setHours] = useState('6');
  const [drafts, setDrafts] = useState<string[]>(['']);
  const [incHours, setIncHours] = useState('');
  const [newTask, setNewTask] = useState('');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!user) return null;
  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const createDay = async () => {
    if (creating) return;                       // block double-submit
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { toast('Enter a valid number of hours', 'error'); return; }
    setCreating(true);
    try {
      const c = await createCommitment(user.id, Math.round(h * 60));
      if (!c.ok) { toast(`Could not create day: ${c.error}`, 'error'); return; }
      const plan = await ensureTodayPlan(0, user.id);
      if (!plan) { toast('Could not create day plan. Try again.', 'error'); return; }
      // de-dupe identical task lines before inserting
      const lines = [...new Set(drafts.map(s => s.trim()).filter(Boolean))];
      for (const d of lines) {
        await addTask({ projectId: null, projectName: null, title: d, priority: 'medium', type: 'must_finish', userId: user.id });
      }
      await refresh();
      toast('Day created ✓', 'success');
    } finally {
      setCreating(false);
    }
  };

  const addNewTask = async () => {
    const title = newTask.trim();
    if (!title || adding) return;               // block double-submit
    setAdding(true);
    setNewTask('');
    try {
      await addTask({ projectId: null, projectName: null, title, priority: 'medium', type: 'must_finish', userId: user.id });
      await refresh();
    } finally {
      setAdding(false);
    }
  };

  const increase = async () => {
    if (!commitment) return;
    const h = parseFloat(incHours);
    if (isNaN(h)) return;
    const newMin = Math.round(h * 60);
    if (newMin > commitment.committed_minutes) {
      await increaseCommitment(commitment.id, newMin);
      setIncHours('');
      await refresh();
    }
  };

  const toggleTask = async (id: string) => {
    const t = myTasks.find(x => x.id === id);
    if (!t) return;
    await completeTask(t, user.id);
    if (t.status !== 'completed') await notify(user.id, 'task_completed', `✅ ${user.name} completed task: ${t.title}`);
    await refresh();
  };

  // ---- before the day is created ----
  if (!commitment) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
        <h2 className="font-bold text-gray-900 text-lg">Today&apos;s Commitment</h2>
        <p className="text-sm text-gray-500 mb-4">Commit your hours, then go earn them.</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">I will work today</label>
        <div className="flex items-center gap-2 mb-4">
          <input type="number" min="1" step="0.5" value={hours} onChange={e => setHours(e.target.value)}
            className="w-24 px-3 py-2.5 text-lg font-bold border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500" />
          <span className="text-gray-600 font-medium">hours</span>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">Tasks</label>
        <div className="space-y-2 mb-4">
          {drafts.map((d, i) => (
            <input key={i} value={d}
              onChange={e => setDrafts(ds => ds.map((x, j) => j === i ? e.target.value : x))}
              onKeyDown={e => { if (e.key === 'Enter') setDrafts(ds => [...ds, '']); }}
              placeholder={`Task ${i + 1}`}
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500" />
          ))}
          <button onClick={() => setDrafts(ds => [...ds, ''])} className="text-xs font-medium text-orange-600 hover:underline">+ Add task line</button>
        </div>

        <button onClick={createDay} disabled={creating} className="w-full py-3 text-base font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 shadow-sm disabled:opacity-60">{creating ? 'Creating…' : 'Create My Day'}</button>
      </div>
    );
  }

  // ---- after the day is created ----
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-gray-900 text-lg">Today&apos;s Commitment</h2>
        <span className="text-sm font-bold text-orange-600">🔒 {formatMinutes(commitment.committed_minutes)}</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">You can increase your goal, but you can&apos;t reduce it after starting the day.</p>

      <div className="flex items-center gap-2 mb-4">
        <input type="number" min={commitment.committed_minutes / 60 + 0.5} step="0.5" value={incHours}
          onChange={e => setIncHours(e.target.value)} placeholder={`> ${commitment.committed_minutes / 60}h`}
          className="w-24 px-3 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500" />
        <button onClick={increase} className="px-3 py-2 text-sm font-semibold text-orange-700 bg-orange-50 rounded-xl hover:bg-orange-100">Increase goal</button>
      </div>

      <div className="space-y-1">
        {myTasks.length === 0 && <p className="text-sm text-gray-400">No tasks. Add what you&apos;ll finish today.</p>}
        {myTasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-1.5 group">
            <button onClick={() => toggleTask(t.id)}
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${t.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-orange-500'}`}>
              {t.status === 'completed' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </button>
            <input defaultValue={t.title}
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== t.title) act(() => updateTaskTitle(t.id, v)); }}
              className={`flex-1 text-sm bg-transparent focus:outline-none ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`} />
            <button onClick={() => act(() => deleteTask(t.id))} className="text-sm text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input value={newTask} onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addNewTask(); }}
          placeholder="+ Add task"
          className="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500" />
      </div>
    </div>
  );
}
