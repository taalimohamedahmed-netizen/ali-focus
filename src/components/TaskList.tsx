'use client';

import { useState } from 'react';
import { Priority, TaskType, getTodayISO } from '@/types';
import { useApp } from '@/lib/AppContext';
import { addTask, completeTask, deleteTask } from '@/lib/api';

export default function TaskList() {
  const { ws, user, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [adv, setAdv] = useState(false);
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
      projectId: proj?.id ?? null, projectName: proj?.name ?? null,
      title, priority, type, userId: user.id,
    }));
    setTitle('');
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5 h-full">
      <h2 className="font-bold text-gray-900 mb-3">Must Finish Today</h2>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="+ Add task"
          className="flex-1 px-3 py-2.5 text-sm border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-orange-500"
        />
        <button onClick={submit} className="px-4 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700">Add</button>
      </div>

      <button onClick={() => setAdv(a => !a)} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
        {adv ? 'Hide options' : 'Options'}
      </button>
      {adv && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-2 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-orange-500">
            <option value="">No project</option>
            {ws.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="px-2 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-orange-500">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={type} onChange={e => setType(e.target.value as TaskType)} className="px-2 py-2 text-xs border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-orange-500">
            <option value="must_finish">Must finish</option>
            <option value="optional">Optional</option>
          </select>
        </div>
      )}

      <div className="mt-4 space-y-1">
        {tasks.length === 0 && <p className="text-sm text-gray-400 py-2">Nothing yet. Add what matters today.</p>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2 group">
            <button
              onClick={() => act(() => completeTask(t, user.id))}
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                t.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-orange-500'
              }`}
            >
              {t.status === 'completed' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
              {(t.project_name || t.type === 'optional') && (
                <p className="text-xs text-gray-400">{t.type === 'optional' ? 'Optional' : ''}{t.project_name ? ` · ${t.project_name}` : ''}</p>
              )}
            </div>
            {t.priority === 'high' && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
            <button onClick={() => act(() => deleteTask(t.id))} className="shrink-0 text-sm text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
