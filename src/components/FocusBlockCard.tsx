'use client';

import { FocusBlock, formatSeconds } from '@/types';
import { useApp } from '@/lib/AppContext';

interface Props {
  block: FocusBlock;
  runningElapsed?: number;
}

export default function FocusBlockCard({ block, runningElapsed }: Props) {
  const { startBlock, pauseBlock, finishBlock } = useApp();

  const displaySeconds = block.status === 'running' && runningElapsed !== undefined
    ? runningElapsed
    : block.totalSeconds;

  const blockNames = ['Block 1: 7:00 - 9:00', 'Block 2: 9:00 - 11:00', 'Block 3: 13:00 - 15:00', 'Block 4: 15:00 - 17:00'];

  const statusConfig = {
    not_started: { label: 'Not Started', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', dot: 'bg-gray-300' },
    running: { label: 'Running', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
    done: { label: 'Completed', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  };

  const config = statusConfig[block.status];

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 md:p-5 transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm md:text-base">{blockNames[block.index]}</h3>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-mono font-bold text-gray-900 mb-3">
        {formatSeconds(displaySeconds)}
      </div>
      <div className="flex gap-2">
        {block.status === 'not_started' && (
          <button
            onClick={() => startBlock(block.id)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start
          </button>
        )}
        {block.status === 'running' && (
          <>
            <button
              onClick={() => pauseBlock(block.id)}
              className="flex-1 px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={() => finishBlock(block.id)}
              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Finish
            </button>
          </>
        )}
        {block.status === 'done' && (
          <div className="flex-1 px-3 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-lg text-center">
            Done
          </div>
        )}
      </div>
    </div>
  );
}
