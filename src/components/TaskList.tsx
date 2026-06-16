'use client';

import { useState } from 'react';
import { Priority, TaskType, getTodayISO } from '@/types';
import { useApp } from '@/lib/AppContext';
import { nameOf } from '@/lib/names';
import { addTask, completeTask, deleteTask } from '@/lib/api';

const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-100 text-[#DC2626]',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
};

export default function TaskList() {
  const { ws, user, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [type, setType] = useState<TaskType>('must_finish');
  if (!user) return null;

  const today = getTodayISO();
  const tasks = ws.tasks
    .filter(t => t.work_date === today)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'must_finish' ? -1 : 1;
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      const rank = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority];
    });

  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const submit = () => {
    if (!title.trim()) return;
    const proj = ws.projects.find(p => p.id === projectId);
    act(() => addTask({
      projectId: proj?.id ?? null,
      projectName: proj?.name ?? null,
      title, priority, type, userId: user.id,
    }));
    setTitle('');
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Tasks</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Task title"
          className="col-span-2 sm:col-span-4 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
        />
        <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB]">
          <option value="">No project</option>
          {ws.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB]">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value as TaskType)} className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#2563EB]">
          <option value="must_finish">Must finish</option>
          <option value="optional">Optional</option>
        </select>
        <button onClick={submit} className="px-3 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700">Add</button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet.</p>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
            <input
              type="checkbox"
              checked={t.status === 'completed'}
              onChange={() => act(() => completeTask(t, user.id))}
              className="w-4 h-4 accent-[#2563EB] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {t.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400 mt-0.5">
                {t.type === 'must_finish' && <span className="font-medium text-[#2563EB]">Must finish</span>}
                {t.project_name && <span>{t.project_name}</span>}
                <span>by {nameOf(ws, t.created_by)}</span>
                {t.completed_by && <span>· done {nameOf(ws, t.completed_by)}</span>}
              </div>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLE[t.priority]}`}>
              {t.priority}
            </span>
            <button onClick={() => act(() => deleteTask(t.id))} className="shrink-0 text-sm text-gray-300 hover:text-[#DC2626]">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
