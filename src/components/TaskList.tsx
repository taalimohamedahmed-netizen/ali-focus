'use client';

import { useState } from 'react';
import { Task, DEFAULT_PROJECTS } from '@/types';
import { useApp } from '@/lib/AppContext';

export default function TaskList() {
  const { todayData, addTask, toggleTaskDone, deleteTask } = useApp();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState<string>(DEFAULT_PROJECTS[0]);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [type, setType] = useState<'must_finish_today' | 'optional'>('must_finish_today');

  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), project, priority, type, done: false });
    setTitle('');
  };

  const sortedTasks = [...todayData.tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.type !== b.type) return a.type === 'must_finish_today' ? -1 : 1;
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const priorityColors = { high: 'bg-red-500', medium: 'bg-blue-500', low: 'bg-gray-300' };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today Tasks</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a task..."
          className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={project}
          onChange={e => setProject(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DEFAULT_PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={type}
          onChange={e => setType(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="must_finish_today">Must Finish</option>
          <option value="optional">Optional</option>
        </select>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {sortedTasks.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No tasks yet. Add one above.</p>
        )}
        {sortedTasks.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              task.done ? 'bg-gray-50' : 'hover:bg-gray-50'
            }`}
          >
            <button
              onClick={() => toggleTaskDone(task.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              {task.done && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority]}`} />
            <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.title}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">{task.project}</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              task.type === 'must_finish_today' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {task.type === 'must_finish_today' ? 'Must' : 'Opt'}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
