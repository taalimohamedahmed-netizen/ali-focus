'use client';

import { useApp } from '@/lib/AppContext';

export default function NotesBox() {
  const { todayData, setNotes } = useApp();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Daily Notes</h2>
      <textarea
        value={todayData.notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Write your notes for today..."
        className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
