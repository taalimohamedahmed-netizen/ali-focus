'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useApp } from '@/lib/AppContext';
import { getLastNDays, formatDate, formatMinutes } from '@/types';
import {
  sessionsForDate, completedMinutesForDate, targetMinutesForDate, tasksForDate,
  dailyScore, missedMustFinish, teamStreak, userStreak, leaderboard,
} from '@/lib/metrics';

function Card({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent ? 'text-[#EA580C]' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ProgressTab() {
  const { ws, user } = useApp();
  const days = useMemo(() => getLastNDays(7), []);

  const rows = useMemo(() => days.map(date => {
    const sessions = sessionsForDate(ws, date);
    return {
      date,
      label: formatDate(date),
      short: formatDate(date).split(',')[0],
      plannedSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      targetMin: targetMinutesForDate(ws, date),
      completedMin: Math.round(completedMinutesForDate(ws, date)),
      completedTasks: tasksForDate(ws, date).filter(t => t.status === 'completed').length,
      missed: missedMustFinish(ws, date),
      score: dailyScore(ws, date),
    };
  }), [days, ws]);

  const summary = useMemo(() => {
    const totalMin = rows.reduce((s, r) => s + r.completedMin, 0);
    const active = rows.filter(r => r.completedMin > 0 || r.plannedSessions > 0);
    const best = [...rows].sort((a, b) => b.completedMin - a.completedMin)[0];
    const worst = [...active].sort((a, b) => a.completedMin - b.completedMin)[0];
    return {
      totalHours: Math.round((totalMin / 60) * 10) / 10,
      avgHours: Math.round((totalMin / 60 / 7) * 10) / 10,
      best, worst,
    };
  }, [rows]);

  const team = useMemo(() => teamStreak(ws), [ws]);
  const myStreak = useMemo(() => (user ? userStreak(ws, user.id) : null), [ws, user]);
  const board = useMemo(() => leaderboard(ws), [ws]);

  const chart = rows.map(r => ({ name: r.short, hours: Math.round((r.completedMin / 60) * 10) / 10, score: r.score }));

  return (
    <div className="space-y-5">
      {/* Weekly summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card value={`${summary.totalHours}h`} label="Total Focused" />
        <Card value={`${summary.avgHours}h`} label="Daily Average" />
        <Card value={summary.best ? formatMinutes(summary.best.completedMin) : '—'} label="Best Day" accent />
        <Card value={summary.worst ? formatMinutes(summary.worst.completedMin) : '—'} label="Worst Day" />
        <Card value={`${team.current}d`} label="Team Streak" accent />
      </div>

      {/* My streak */}
      {myStreak && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Your Streak — {user!.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><div className="text-2xl font-bold text-[#EA580C]">{myStreak.current}d</div><div className="text-xs text-gray-500">Current</div></div>
            <div><div className="text-2xl font-bold text-gray-900">{myStreak.best}d</div><div className="text-xs text-gray-500">Best</div></div>
            <div><div className="text-2xl font-bold text-gray-900">{myStreak.totalSuccessful}</div><div className="text-xs text-gray-500">Total Days</div></div>
            <div><div className="text-2xl font-bold text-gray-900">{myStreak.lastActive ? formatDate(myStreak.lastActive) : '—'}</div><div className="text-xs text-gray-500">Last Active</div></div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Focused Hours Per Day</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} formatter={(v) => [`${v}h`, 'Hours']} />
            <Bar dataKey="hours" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Daily Score</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} formatter={(v) => [v, 'Score']} />
            <Line type="monotone" dataKey="score" stroke="#EA580C" strokeWidth={2} dot={{ fill: '#EA580C', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 7-day breakdown */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Last 7 Days</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 text-left">
                <th className="px-5 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Sessions</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Done</th>
                <th className="px-3 py-2 font-medium">Tasks</th>
                <th className="px-3 py-2 font-medium">Missed</th>
                <th className="px-3 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.date} className="border-t border-gray-100">
                  <td className="px-5 py-2.5 font-medium text-gray-900 whitespace-nowrap">{r.label}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.completedSessions}/{r.plannedSessions}</td>
                  <td className="px-3 py-2.5 text-gray-600">{formatMinutes(r.targetMin)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{formatMinutes(r.completedMin)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.completedTasks}</td>
                  <td className={`px-3 py-2.5 ${r.missed > 0 ? 'text-[#DC2626] font-medium' : 'text-gray-400'}`}>{r.missed || '—'}</td>
                  <td className={`px-3 py-2.5 font-bold ${r.score >= 80 ? 'text-green-600' : r.score >= 50 ? 'text-[#EA580C]' : 'text-gray-400'}`}>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Leaderboard — This Week</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 text-left">
                <th className="px-5 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Focused</th>
                <th className="px-3 py-2 font-medium">Tasks</th>
                <th className="px-3 py-2 font-medium">Streak</th>
                <th className="px-3 py-2 font-medium">Best</th>
              </tr>
            </thead>
            <tbody>
              {board.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-gray-400">No users yet.</td></tr>}
              {board.map(r => (
                <tr key={r.userId} className={`border-t border-gray-100 ${r.userId === user?.id ? 'bg-[#EA580C]/5' : ''}`}>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{formatMinutes(r.focusedMinutes)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.completedTasks}</td>
                  <td className="px-3 py-2.5 text-[#EA580C] font-medium">{r.currentStreak}d</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.bestStreak}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
