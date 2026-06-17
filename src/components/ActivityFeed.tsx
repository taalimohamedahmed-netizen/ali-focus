'use client';

import { useApp } from '@/lib/AppContext';

function ago(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ActivityFeed() {
  const { ws } = useApp();
  const feed = ws.activity.filter(a => a.message).slice(0, 12);
  if (feed.length === 0) return null;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-3xl shadow-sm p-5">
      <h2 className="font-bold text-gray-900 text-lg mb-3">Team Activity</h2>
      <div className="space-y-2">
        {feed.map(a => (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 text-gray-700 truncate">{a.message}</span>
            <span className="text-xs text-gray-300 shrink-0">{ago(a.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
