'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/AppContext';

const SEEN_KEY = 'aliFocusLastSeen';

function ago(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { ws } = useApp();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const prevTop = useRef<string | null>(null);

  const feed = ws.activity.filter(a => a.message);
  const unread = feed.filter(a => new Date(a.created_at).getTime() > lastSeen).length;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSeen(Number(localStorage.getItem(SEEN_KEY) ?? 0));
  }, []);

  // optional browser notification for the newest event
  useEffect(() => {
    const top = feed[0];
    if (!top) return;
    if (prevTop.current && prevTop.current !== top.id && new Date(top.created_at).getTime() > lastSeen) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Ali Focus', { body: top.message ?? '' });
      }
    }
    prevTop.current = top.id;
  }, [feed, lastSeen]);

  const openBell = () => {
    setOpen(o => !o);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    if (!open) {
      const now = Date.now();
      localStorage.setItem(SEEN_KEY, String(now));
      setLastSeen(now);
    }
  };

  return (
    <div className="relative">
      <button onClick={openBell} aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center text-gray-600 bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-orange-600 rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto z-50 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-2">
            <p className="text-xs font-semibold text-gray-400 px-2 py-1">Notifications</p>
            {feed.length === 0 && <p className="text-sm text-gray-400 px-2 py-3">Nothing yet.</p>}
            {feed.slice(0, 20).map(a => (
              <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 text-sm">
                <span className="flex-1 text-gray-700">{a.message}</span>
                <span className="text-[10px] text-gray-300 shrink-0 mt-0.5">{ago(a.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
