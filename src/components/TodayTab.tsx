'use client';

import { useApp } from '@/lib/AppContext';
import TodayProgress from './TodayProgress';
import FocusBlockCard from './FocusBlockCard';
import TaskList from './TaskList';
import NotesBox from './NotesBox';

export default function TodayTab() {
  const { todayData, totalTodaySeconds } = useApp();

  return (
    <div className="space-y-5">
      <TodayProgress />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {todayData.focusBlocks.map(block => (
          <FocusBlockCard
            key={block.id}
            block={block}
            runningElapsed={block.status === 'running' && block.startedAt
              ? block.totalSeconds + (Date.now() - block.startedAt) / 1000
              : undefined
            }
          />
        ))}
      </div>
      <TaskList />
      <NotesBox />
    </div>
  );
}
