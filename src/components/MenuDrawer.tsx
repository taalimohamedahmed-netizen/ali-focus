'use client';

import { useRef, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { exportAll, importAll } from '@/lib/api';
import ProjectsManager from './ProjectsManager';
import NotesBox from './NotesBox';

export default function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout, refresh } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const handleExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ali-focus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const res = await importAll(ev.target?.result as string);
      setMsg(res.ok ? 'Imported ✓' : `Failed: ${res.error}`);
      await refresh();
      setTimeout(() => setMsg(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-[#F5F7FA] shadow-xl transition-transform overflow-y-auto ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="font-bold text-gray-900">{user?.name}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 space-y-4 pb-8">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Projects</h3>
            <ProjectsManager />
          </div>

          <NotesBox />

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">Data</h3>
            <button onClick={handleExport} className="w-full py-2 text-sm font-medium text-gray-700 bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50">Export JSON</button>
            <button onClick={() => fileRef.current?.click()} className="w-full py-2 text-sm font-medium text-gray-700 bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50">Import JSON</button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            {msg && <p className="text-xs text-gray-500 text-center">{msg}</p>}
          </div>

          <button onClick={logout} className="w-full py-2.5 text-sm font-semibold text-red-600 bg-white border border-[#E5E7EB] rounded-xl hover:bg-red-50">Logout</button>
        </div>
      </aside>
    </>
  );
}
