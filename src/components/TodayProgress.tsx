'use client';

import { useApp } from '@/lib/AppContext';

export default function TodayProgress() {
  const { totalTodaySeconds, completedBlocksCount, todayData } = useApp();
  const targetSeconds = 8 * 3600;
  const percent = Math.min(100, Math.round((totalTodaySeconds / targetSeconds) * 100));

  const mustFinishTotal = todayData.tasks.filter(t => t.type === 'must_finish_today').length;
  const mustFinishDone = todayData.tasks.filter(t => t.type === 'must_finish_today' && t.done).length;
  const totalTasks = todayData.tasks.length;
  const doneTasks = todayData.tasks.filter(t => t.done).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Today Progress</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900">
            {Math.floor(totalTodaySeconds / 3600)}h {Math.floor((totalTodaySeconds % 3600) / 60)}m
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Focused Hours</div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900">{completedBlocksCount}/4</div>
          <div className="text-xs text-gray-500 mt-0.5">Blocks Done</div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-bold text-blue-600">{percent}%</div>
          <div className="text-xs text-gray-500 mt-0.5">of 8h Target</div>
        </div>
        <div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900">{doneTasks}/{totalTasks}</div>
          <div className="text-xs text-gray-500 mt-0.5">Tasks Done</div>
        </div>
      </div>
      <div className="mt-3 w-full bg-gray-100 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
