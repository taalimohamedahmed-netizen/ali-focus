'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useApp } from '@/lib/AppContext';
import { getLast7Days, getDaysSince, computeDayScore, formatDate } from '@/types';

export default function ProgressTab() {
  const { data } = useApp();

  const weekDays = useMemo(() => getLast7Days(), []);

  const weekData = useMemo(() => {
    return weekDays.map(date => {
      const day = data.days[date];
      if (!day) {
        return {
          date,
          label: formatDate(date),
          focusedHours: 0,
          completedBlocks: 0,
          completedTasks: 0,
          missedMustFinish: 0,
          score: 0,
          isEmpty: true,
        };
      }
      const totalSeconds = day.focusBlocks.reduce((s, b) => s + b.totalSeconds, 0);
      const focusedHours = Math.round((totalSeconds / 3600) * 100) / 100;
      const completedBlocks = day.focusBlocks.filter(b => b.status === 'done').length;
      const completedTasks = day.tasks.filter(t => t.done).length;
      const missedMustFinish = day.tasks.filter(t => t.type === 'must_finish_today' && !t.done).length;
      const score = computeDayScore(day, data.deadlines);
      return {
        date,
        label: formatDate(date),
        focusedHours,
        completedBlocks,
        completedTasks,
        missedMustFinish,
        score,
        isEmpty: false,
      };
    });
  }, [weekDays, data]);

  const weeklyStats = useMemo(() => {
    const nonEmpty = weekData.filter(d => !d.isEmpty);
    if (nonEmpty.length === 0) {
      return {
        totalHours: 0,
        avgHours: 0,
        bestDay: null as any,
        worstDay: null as any,
        streak: 0,
      };
    }
    const totalHours = weekData.reduce((s, d) => s + d.focusedHours, 0);
    const avgHours = Math.round((totalHours / 7) * 100) / 100;
    const sorted = [...nonEmpty].sort((a, b) => b.score - a.score);
    const bestDay = sorted[0];
    const worstDay = sorted[sorted.length - 1];

    let streak = 0;
    for (let i = weekDays.length - 1; i >= 0; i--) {
      const day = data.days[weekDays[i]];
      if (day && day.focusBlocks.some(b => b.status === 'done')) {
        streak++;
      } else {
        break;
      }
    }

    return { totalHours: Math.round(totalHours * 100) / 100, avgHours, bestDay, worstDay, streak };
  }, [weekData, weekDays, data]);

  const chartData = weekData.map(d => ({
    name: d.label.split(',')[0],
    hours: d.focusedHours,
    score: d.score,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{weeklyStats.totalHours}h</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Hours</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{weeklyStats.avgHours}h</div>
          <div className="text-xs text-gray-500 mt-0.5">Daily Avg</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {weeklyStats.bestDay ? `${weeklyStats.bestDay.focusedHours}h` : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Best Day</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {weeklyStats.worstDay ? `${weeklyStats.worstDay.focusedHours}h` : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Worst Day</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{weeklyStats.streak}</div>
          <div className="text-xs text-gray-500 mt-0.5">Day Streak</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Focused Hours</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
              formatter={(value: any) => [`${value}h`, 'Focused Hours']}
            />
            <Bar dataKey="hours" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Daily Score</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }}
              formatter={(value: any) => [value, 'Score']}
            />
            <Line type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={2} dot={{ fill: '#2563EB', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Daily Breakdown</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {weekData.map(day => (
            <div key={day.date} className="flex items-center gap-4 px-4 md:px-5 py-3 text-sm">
              <div className="w-24 text-gray-900 font-medium">{day.label}</div>
              <div className="flex-1 flex gap-4 md:gap-6">
                <span className="text-gray-600">{day.focusedHours}h</span>
                <span className="text-gray-400 hidden sm:inline">{day.completedBlocks}/4 blocks</span>
                <span className="text-gray-400 hidden sm:inline">{day.completedTasks} tasks</span>
                {day.missedMustFinish > 0 && (
                  <span className="text-red-500 font-medium">{day.missedMustFinish} missed</span>
                )}
              </div>
              <div className={`font-bold ${day.score >= 80 ? 'text-green-600' : day.score >= 50 ? 'text-blue-600' : 'text-red-500'}`}>
                {day.score}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
