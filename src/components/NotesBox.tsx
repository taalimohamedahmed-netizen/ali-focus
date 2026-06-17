'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { getTodayISO } from '@/types';
import { saveNote } from '@/lib/api';

export default function NotesBox() {
  const { ws, user } = useApp();
  const today = getTodayISO();
  const remote = ws.notes.find(n => n.work_date === today)?.content ?? '';
  const [value, setValue] = useState(remote);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // adopt remote content only while the user isn't actively editing
  useEffect(() => {
    if (!dirty.current) setValue(remote);
  }, [remote]);

  if (!user) return null;

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveNote(v, user.id);
      dirty.current = false;
      setSaved(true);
    }, 700);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Daily Notes</h2>
        <span className="text-xs text-gray-400">{saved ? 'Saved' : 'Saving…'}</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Notes for today…"
        className="w-full h-28 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg resize-none focus:outline-none focus:border-[#EA580C]"
      />
    </div>
  );
}
