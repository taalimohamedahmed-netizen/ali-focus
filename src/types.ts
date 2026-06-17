// ---------------------------------------------------------------------------
// Domain types — mirror the Supabase schema (snake_case columns)
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';
export type TaskType = 'must_finish' | 'optional';
export type OpenStatus = 'open' | 'completed';
export type SessionStatus = 'not_started' | 'running' | 'paused' | 'completed';

export interface User {
  id: string;
  name: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface DayPlan {
  id: string;
  work_date: string;
  target_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  day_plan_id: string;
  title: string;
  duration_minutes: number;
  completed_minutes: number;
  status: SessionStatus;
  started_by: string | null;
  started_at: string | null;
  paused_by: string | null;
  paused_at: string | null;
  finished_by: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  work_date: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  priority: Priority;
  type: TaskType;
  status: OpenStatus;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Deadline {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  priority: Priority;
  status: OpenStatus;
  deadline_date: string;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DailyNote {
  id: string;
  work_date: string;
  content: string;
  updated_by: string | null;
  updated_at: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  work_date: string;
  committed_minutes: number;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'hour_milestone' | 'commitment_completed' | 'task_completed'
  | 'at_risk' | 'penalty_applied' | 'session_finished' | 'break_finished'
  | 'extra_hour';

export interface Activity {
  id: string;
  user_id: string | null;
  action: string | null;
  type: NotificationType | string | null;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
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

// ---------------------------------------------------------------------------
// Date / format helpers
// ---------------------------------------------------------------------------

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoForOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) dates.push(isoForOffset(i));
  return dates;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Whole days from today to a target date. >0 future, 0 today, <0 past.
export function getDaysRemaining(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Start of the current week (Monday) as an ISO date string.
export function startOfWeekISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
