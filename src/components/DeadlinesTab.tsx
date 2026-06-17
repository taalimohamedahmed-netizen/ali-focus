'use client';

import { useState } from 'react';
import { Priority, formatDate, getDaysRemaining } from '@/types';
import { useApp } from '@/lib/AppContext';
import { nameOf } from '@/lib/names';
import { deadlineState } from '@/lib/metrics';
import { addDeadline, completeDeadline, deleteDeadline } from '@/lib/api';

const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-100 text-[#DC2626]',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
};

export default function DeadlinesTab() {
  const { ws, user, refresh } = useApp();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  if (!user) return null;

  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  const submit = () => {
    if (!title.trim() || !date) return;
    const proj = ws.projects.find(p => p.id === projectId);
    act(() => addDeadline({
      projectId: proj?.id ?? null, projectName: proj?.name ?? null,
      title, priority, deadlineDate: date, userId: user.id,
    }));
    setTitle(''); setDate('');
  };

  const sorted = [...ws.deadlines].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return a.deadline_date.localeCompare(b.deadline_date);
  });

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Add Deadline</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EA580C]"
          />
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#EA580C]">
            <option value="">No project</option>
            {ws.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EA580C]" />
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:border-[#EA580C]">
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button onClick={submit} className="px-4 py-2 text-sm font-medium text-white bg-[#EA580C] rounded-lg hover:bg-orange-700">Add</button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm divide-y divide-gray-100">
        {sorted.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No deadlines yet.</p>}
        {sorted.map(d => {
          const state = deadlineState(d);
          const days = getDaysRemaining(d.deadline_date);
          const badge =
            state === 'completed' ? { t: 'Completed', c: 'text-green-700 bg-green-100' } :
            state === 'overdue' ? { t: 'Overdue', c: 'text-[#DC2626] bg-red-100' } :
            state === 'urgent' ? { t: 'Urgent · Today', c: 'text-[#DC2626] bg-red-100' } :
            { t: `${days}d left`, c: 'text-gray-500 bg-gray-100' };
          return (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3">
              <input
                type="checkbox" checked={d.status === 'completed'}
                onChange={() => act(() => completeDeadline(d, user.id))}
                className="w-4 h-4 accent-[#EA580C] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${d.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{d.title}</p>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-400 mt-0.5">
                  {d.project_name && <span>{d.project_name}</span>}
                  <span>{formatDate(d.deadline_date)}</span>
                  <span>by {nameOf(ws, d.created_by)}</span>
                  {d.completed_by && <span>· done {nameOf(ws, d.completed_by)}</span>}
                </div>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLE[d.priority]}`}>{d.priority}</span>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.c}`}>{badge.t}</span>
              <button onClick={() => act(() => deleteDeadline(d.id))} className="shrink-0 text-sm text-gray-300 hover:text-[#DC2626]">✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
