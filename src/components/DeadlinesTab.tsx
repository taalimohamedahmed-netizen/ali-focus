'use client';

import { useState } from 'react';
import { DEFAULT_PROJECTS, getDaysSince, formatDate } from '@/types';
import { useApp } from '@/lib/AppContext';

export default function DeadlinesTab() {
  const { data, addDeadline, toggleDeadlineDone, deleteDeadline } = useApp();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState<string>(DEFAULT_PROJECTS[0]);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAdd = () => {
    if (!title.trim() || !deadlineDate) return;
    addDeadline({ title: title.trim(), project, deadlineDate, priority, done: false });
    setTitle('');
    setDeadlineDate('');
  };

  const sortedDeadlines = [...data.deadlines].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const daysA = getDaysSince(a.deadlineDate);
    const daysB = getDaysSince(b.deadlineDate);
    return daysA - daysB;
  });

  const priorityColors = { high: 'bg-red-500', medium: 'bg-blue-500', low: 'bg-gray-300' };
  const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Deadline</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title..."
            className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={project}
            onChange={e => setProject(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEFAULT_PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            type="date"
            value={deadlineDate}
            onChange={e => setDeadlineDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        {sortedDeadlines.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">No deadlines yet.</p>
        )}
        {sortedDeadlines.map(deadline => {
          const daysLeft = getDaysSince(deadline.deadlineDate);
          let statusLabel = '';
          let statusClass = '';
          if (deadline.done) {
            statusLabel = 'Done';
            statusClass = 'text-green-600 bg-green-50';
          } else if (daysLeft < 0) {
            statusLabel = 'Overdue';
            statusClass = 'text-red-600 bg-red-50';
          } else if (daysLeft === 0) {
            statusLabel = 'Urgent';
            statusClass = 'text-red-600 bg-red-50';
          } else {
            statusLabel = `${daysLeft}d left`;
            statusClass = 'text-gray-500 bg-gray-50';
          }

          return (
            <div
              key={deadline.id}
              className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-gray-100 last:border-b-0"
            >
              <button
                onClick={() => toggleDeadlineDone(deadline.id)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  deadline.done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {deadline.done && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[deadline.priority]}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm block truncate ${deadline.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {deadline.title}
                </span>
                <span className="text-xs text-gray-400">{deadline.project}</span>
              </div>
              <div className="hidden sm:block text-xs text-gray-400">
                {formatDate(deadline.deadlineDate)}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusClass}`}>
                {statusLabel}
              </span>
              <button
                onClick={() => deleteDeadline(deadline.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
