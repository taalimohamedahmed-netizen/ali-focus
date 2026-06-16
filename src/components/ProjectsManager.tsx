'use client';

import { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { addProject, renameProject, deleteProject } from '@/lib/api';

export default function ProjectsManager() {
  const { ws, user, refresh } = useApp();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  if (!user) return null;

  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs font-medium text-[#2563EB] hover:underline"
      >
        {open ? 'Hide projects' : 'Manage projects'}
      </button>

      {open && (
        <div className="mt-3 space-y-2 bg-[#F5F7FA] border border-[#E5E7EB] rounded-xl p-3">
          {ws.projects.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                defaultValue={p.name}
                onBlur={e => {
                  const v = e.target.value.trim();
                  if (v && v !== p.name) act(() => renameProject(p.id, v));
                }}
                className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
              />
              <button
                onClick={() => {
                  if (confirm(`Delete project "${p.name}"?`)) act(() => deleteProject(p.id));
                }}
                className="text-xs text-[#DC2626] px-2 py-1.5 hover:bg-red-50 rounded-lg"
              >
                Delete
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New project name"
              className="flex-1 px-2.5 py-1.5 text-sm bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
            <button
              onClick={() => {
                if (newName.trim()) { act(() => addProject(newName, user.id)); setNewName(''); }
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
