'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { loadScreenshots, deleteScreenshot, Screenshot } from '@/lib/api';

export default function ScreenshotsTab() {
  const { ws, user } = useApp();
  const [shots, setShots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<Screenshot | null>(null);

  const load = async () => {
    setLoading(true);
    setShots(await loadScreenshots());
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  if (!user) return null;

  const nameFor = (id: string | null) => ws.users.find(u => u.id === id)?.name ?? 'Unknown';
  const fmt = (iso: string) => new Date(iso).toLocaleString();

  const remove = async (s: Screenshot) => {
    await deleteScreenshot(s);
    setShots(prev => prev.filter(x => x.id !== s.id));
    setZoom(null);
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{shots.length} screenshot{shots.length === 1 ? '' : 's'}</p>
        <button onClick={load} className="text-sm font-semibold text-orange-600 hover:text-orange-700">Refresh</button>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && shots.length === 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center text-sm text-gray-500">
          No screenshots yet. Start a focus session and allow screen sharing.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {shots.map(s => (
          <button key={s.id} onClick={() => setZoom(s)}
            className="group relative aspect-video overflow-hidden rounded-xl border border-[#E5E7EB] bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt="screenshot" className="w-full h-full object-cover" loading="lazy" />
            <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 text-left truncate">
              {nameFor(s.user_id)} · {fmt(s.captured_at)}
            </span>
          </button>
        ))}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.url} alt="screenshot" className="w-full rounded-xl" />
            <div className="flex items-center justify-between mt-3 text-white text-sm">
              <span>{nameFor(zoom.user_id)} · {fmt(zoom.captured_at)}</span>
              <div className="flex gap-3">
                <a href={zoom.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">Open</a>
                <button onClick={() => remove(zoom)} className="font-semibold text-red-400 hover:text-red-300">Delete</button>
                <button onClick={() => setZoom(null)} className="font-semibold hover:underline">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
