'use client';

import { Session } from '@/types';
import { useApp } from '@/lib/AppContext';
import { liveSessionMinutes } from '@/lib/metrics';
import { nameOf } from '@/lib/names';
import { formatMinutes } from '@/types';
import {
  startSession, pauseSession, resumeSession, finishSession, deleteSession,
} from '@/lib/api';

const STATUS_LABEL: Record<Session['status'], string> = {
  not_started: 'Not Started',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
};

const STATUS_STYLE: Record<Session['status'], string> = {
  not_started: 'bg-gray-100 text-gray-600',
  running: 'bg-[#2563EB]/10 text-[#2563EB]',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

export default function SessionCard({ session }: { session: Session }) {
  const { ws, user, refresh } = useApp();
  if (!user) return null;

  const live = liveSessionMinutes(session);
  const pct = session.duration_minutes > 0
    ? Math.min(100, (live / session.duration_minutes) * 100) : 0;

  const act = async (fn: () => Promise<void>) => { await fn(); await refresh(); };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatMinutes(live)} / {formatMinutes(session.duration_minutes)}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[session.status]}`}>
          {STATUS_LABEL[session.status]}
        </span>
      </div>

      <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-[#2563EB] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {session.status === 'not_started' && (
          <>
            <Btn primary onClick={() => act(() => startSession(session, user.id))}>Start</Btn>
            <Btn danger onClick={() => act(() => deleteSession(session.id))}>Delete</Btn>
          </>
        )}
        {session.status === 'running' && (
          <>
            <Btn onClick={() => act(() => pauseSession(session, user.id))}>Pause</Btn>
            <Btn primary onClick={() => act(() => finishSession(session, user.id))}>Finish</Btn>
          </>
        )}
        {session.status === 'paused' && (
          <>
            <Btn primary onClick={() => act(() => resumeSession(session, user.id))}>Resume</Btn>
            <Btn onClick={() => act(() => finishSession(session, user.id))}>Finish</Btn>
          </>
        )}
        {session.status === 'completed' && (
          <Btn danger onClick={() => act(() => deleteSession(session.id))}>Delete</Btn>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-3 space-y-0.5">
        {session.started_by && <p>Started by {nameOf(ws, session.started_by)}</p>}
        {session.paused_by && session.status === 'paused' && <p>Paused by {nameOf(ws, session.paused_by)}</p>}
        {session.finished_by && <p>Finished by {nameOf(ws, session.finished_by)}</p>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, primary, danger }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean;
}) {
  const base = 'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors';
  const style = primary
    ? 'bg-[#2563EB] text-white hover:bg-blue-700'
    : danger
      ? 'text-[#DC2626] bg-white border border-[#E5E7EB] hover:bg-red-50'
      : 'text-gray-700 bg-white border border-[#E5E7EB] hover:bg-gray-50';
  return <button onClick={onClick} className={`${base} ${style}`}>{children}</button>;
}
