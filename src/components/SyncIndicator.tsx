'use client';

import { useApp } from '@/lib/AppContext';

const LABELS: Record<string, { text: string; color: string; dot: string }> = {
  idle: { text: 'Local', color: 'text-gray-400', dot: 'bg-gray-300' },
  syncing: { text: 'Syncing…', color: 'text-blue-500', dot: 'bg-blue-400 animate-pulse' },
  synced: { text: 'Synced', color: 'text-green-600', dot: 'bg-green-500' },
  offline: { text: 'Offline', color: 'text-amber-600', dot: 'bg-amber-500' },
  unauthorized: { text: 'Locked', color: 'text-red-600', dot: 'bg-red-500' },
  disabled: { text: 'Local only', color: 'text-gray-400', dot: 'bg-gray-300' },
};

export default function SyncIndicator() {
  const { syncStatus } = useApp();
  const s = LABELS[syncStatus] ?? LABELS.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.color}`} title="Cloud sync status">
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {s.text}
    </span>
  );
}
