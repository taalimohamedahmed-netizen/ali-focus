export interface FocusBlock {
  id: string;
  index: number;
  status: 'not_started' | 'running' | 'done';
  startedAt: number | null;
  totalSeconds: number;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: 'high' | 'medium' | 'low';
  type: 'must_finish_today' | 'optional';
  done: boolean;
  createdAt: string;
}

export interface DayData {
  date: string;
  focusBlocks: FocusBlock[];
  tasks: Task[];
  notes: string;
}

export interface Deadline {
  id: string;
  title: string;
  project: string;
  deadlineDate: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  createdAt: string;
}

export interface AppData {
  days: Record<string, DayData>;
  deadlines: Deadline[];
  updatedAt?: number;
}

export type TabId = 'today' | 'deadlines' | 'progress';

export const DEFAULT_PROJECTS = [
  'GG Theme',
  'Client Theme 2',
  'Client Theme 3',
  'English',
  'AI Automation',
  'Portfolio',
] as const;

export function createEmptyDayData(date: string): DayData {
  return {
    date,
    focusBlocks: Array.from({ length: 4 }, (_, i) => ({
      id: `block-${date}-${i}`,
      index: i,
      status: 'not_started' as const,
      startedAt: null,
      totalSeconds: 0,
    })),
    tasks: [],
    notes: '',
  };
}

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getDaysSince(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function getLast7Days(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

export function computeDayScore(day: DayData, deadlines: Deadline[]): number {
  let score = 0;
  const totalFocusedSeconds = day.focusBlocks.reduce((s, b) => s + b.totalSeconds, 0);
  if (totalFocusedSeconds >= 8 * 3600) score += 50;
  const mustFinishTasks = day.tasks.filter(t => t.type === 'must_finish_today');
  const allMustDone = mustFinishTasks.length > 0 && mustFinishTasks.every(t => t.done);
  if (mustFinishTasks.length === 0 || allMustDone) score += 30;
  const missedDeadlines = deadlines.filter(d => {
    if (d.done) return false;
    const remaining = getDaysSince(d.deadlineDate);
    return remaining < 0;
  });
  if (missedDeadlines.length === 0) score += 20;
  return score;
}
