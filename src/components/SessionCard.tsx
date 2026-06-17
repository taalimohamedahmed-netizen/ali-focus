'use client';

import { Session, formatMinutes } from '@/types';
import { useApp } from '@/lib/AppContext';
import { liveSessionMinutes } from '@/lib/metrics';
import { nameOf } from '@/lib/names';
import {
  startSession, pauseSession, resumeSession, finishSession, deleteSession,
} from '@/lib/api';

const DOT: Record<Session['status'], string> = {
  not_started: 'bg-gray-300',
  running: 'bg-orange-500 animate-pulse',
  paused: 'bg-amber-400',
  completed: 'bg-green-500',
};

export default function SessionCard({ session }: { session: Session }) {
  const { ws, user, refresh } = useApp();
  if (!user) return null;
  const live = liveSessionMinutes(session);
  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[session.status]}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${session.status === 'completed' ? 'text-gray-400' : 'text-gray-900'}`}>
          {session.title}
        </p>
        <p className="text-xs text-gray-400">
          {formatMinutes(live)} / {formatMinutes(session.duration_minutes)}
          {session.finished_by && ` · ${nameOf(ws, session.finished_by)}`}
        </p>
      </div>
      <div className="flex gap-1 shrink-0">
        {session.status === 'not_started' && (
          <Mini onClick={() => act(() => startSession(session, user.id))} primary>Start</Mini>
        )}
        {session.status === 'running' && (
          <>
            <Mini onClick={() => act(() => pauseSession(session, user.id))}>Pause</Mini>
            <Mini onClick={() => act(() => finishSession(session, user.id))} primary>Finish</Mini>
          </>
        )}
        {session.status === 'paused' && (
          <Mini onClick={() => act(() => resumeSession(session, user.id))} primary>Resume</Mini>
        )}
        {(session.status === 'not_started' || session.status === 'completed') && (
          <Mini onClick={() => act(() => deleteSession(session.id))}>✕</Mini>
        )}
      </div>
    </div>
  );
}

function Mini({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
        primary ? 'bg-orange-600 text-white hover:bg-orange-700'
          : 'text-gray-500 bg-white border border-[#E5E7EB] hover:bg-gray-50'
      }`}>
      {children}
    </button>
  );
}
