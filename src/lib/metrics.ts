import { Workspace } from '@/lib/api';
import {
  Session, Task, Deadline, getTodayISO, isoForOffset, startOfWeekISO,
} from '@/types';

// Live minutes for a session, including the in-progress running stretch.
export function liveSessionMinutes(s: Session): number {
  if (s.status === 'running' && s.started_at) {
    return s.completed_minutes + (Date.now() - new Date(s.started_at).getTime()) / 60000;
  }
  return s.completed_minutes;
}

function planForDate(ws: Workspace, date: string) {
  return ws.dayPlans.find(p => p.work_date === date) ?? null;
}

export function sessionsForDate(ws: Workspace, date: string): Session[] {
  const plan = planForDate(ws, date);
  if (!plan) return [];
  return ws.sessions.filter(s => s.day_plan_id === plan.id);
}

export function tasksForDate(ws: Workspace, date: string): Task[] {
  return ws.tasks.filter(t => t.work_date === date);
}

export function completedMinutesForDate(ws: Workspace, date: string): number {
  return sessionsForDate(ws, date).reduce((sum, s) => sum + liveSessionMinutes(s), 0);
}

export function targetMinutesForDate(ws: Workspace, date: string): number {
  return planForDate(ws, date)?.target_minutes ?? 0;
}

// A day is successful if the target time was met OR all must-finish tasks done.
export function isDaySuccessful(ws: Workspace, date: string): boolean {
  const target = targetMinutesForDate(ws, date);
  const completed = completedMinutesForDate(ws, date);
  const targetMet = target > 0 && completed >= target;

  const must = tasksForDate(ws, date).filter(t => t.type === 'must_finish');
  const mustMet = must.length > 0 && must.every(t => t.status === 'completed');

  return targetMet || mustMet;
}

export interface TeamStreak {
  current: number;
  best: number;
  lastSuccessful: string | null;
  todayStatus: 'Safe' | 'At Risk' | 'Failed';
}

export function teamStreak(ws: Workspace): TeamStreak {
  const today = getTodayISO();

  // Current streak: consecutive successful days ending today, or yesterday if
  // today is not done yet (the day is still in progress).
  let current = 0;
  const startOffset = isDaySuccessful(ws, today) ? 0 : 1;
  for (let i = startOffset; i < 400; i++) {
    if (isDaySuccessful(ws, isoForOffset(i))) current++;
    else break;
  }

  // Best streak across the last ~400 days.
  let best = 0, run = 0;
  for (let i = 399; i >= 0; i--) {
    if (isDaySuccessful(ws, isoForOffset(i))) { run++; best = Math.max(best, run); }
    else run = 0;
  }

  let lastSuccessful: string | null = null;
  for (let i = 0; i < 400; i++) {
    const d = isoForOffset(i);
    if (isDaySuccessful(ws, d)) { lastSuccessful = d; break; }
  }

  const todayStatus: TeamStreak['todayStatus'] = isDaySuccessful(ws, today) ? 'Safe' : 'At Risk';

  return { current, best, lastSuccessful, todayStatus };
}

// ---------------------------------------------------------------------------
// Per-user streaks
// ---------------------------------------------------------------------------

function userActiveOnDate(ws: Workspace, userId: string, date: string): boolean {
  const session = ws.sessions.some(s =>
    s.finished_by === userId && s.finished_at?.slice(0, 10) === date);
  const task = ws.tasks.some(t =>
    t.completed_by === userId && t.completed_at?.slice(0, 10) === date);
  return session || task;
}

export interface UserStreak {
  current: number;
  best: number;
  totalSuccessful: number;
  lastActive: string | null;
}

export function userStreak(ws: Workspace, userId: string): UserStreak {
  const today = getTodayISO();
  let current = 0;
  const startOffset = userActiveOnDate(ws, userId, today) ? 0 : 1;
  for (let i = startOffset; i < 400; i++) {
    if (userActiveOnDate(ws, userId, isoForOffset(i))) current++;
    else break;
  }

  let best = 0, run = 0, total = 0;
  for (let i = 399; i >= 0; i--) {
    if (userActiveOnDate(ws, userId, isoForOffset(i))) {
      run++; best = Math.max(best, run); total++;
    } else run = 0;
  }

  let lastActive: string | null = null;
  for (let i = 0; i < 400; i++) {
    const d = isoForOffset(i);
    if (userActiveOnDate(ws, userId, d)) { lastActive = d; break; }
  }

  return { current, best, totalSuccessful: total, lastActive };
}

// ---------------------------------------------------------------------------
// Daily score (max 100)
// ---------------------------------------------------------------------------

export function dailyScore(ws: Workspace, date: string): number {
  let score = 0;
  const target = targetMinutesForDate(ws, date);
  if (target > 0 && completedMinutesForDate(ws, date) >= target) score += 50;

  const must = tasksForDate(ws, date).filter(t => t.type === 'must_finish');
  if (must.length === 0 || must.every(t => t.status === 'completed')) score += 30;

  if (!hasOverdueDeadlines(ws, date)) score += 20;
  return score;
}

function hasOverdueDeadlines(ws: Workspace, asOf: string): boolean {
  return ws.deadlines.some(d =>
    d.status === 'open' && d.deadline_date < asOf);
}

export function missedMustFinish(ws: Workspace, date: string): number {
  return tasksForDate(ws, date).filter(t => t.type === 'must_finish' && t.status !== 'completed').length;
}

// ---------------------------------------------------------------------------
// Leaderboard (this week)
// ---------------------------------------------------------------------------

export interface LeaderRow {
  userId: string;
  name: string;
  focusedMinutes: number;
  completedTasks: number;
  currentStreak: number;
  bestStreak: number;
}

export function leaderboard(ws: Workspace): LeaderRow[] {
  const weekStart = startOfWeekISO();
  return ws.users.map(u => {
    const focusedMinutes = ws.sessions
      .filter(s => s.finished_by === u.id && s.finished_at && s.finished_at.slice(0, 10) >= weekStart)
      .reduce((sum, s) => sum + s.completed_minutes, 0);
    const completedTasks = ws.tasks
      .filter(t => t.completed_by === u.id && t.completed_at && t.completed_at.slice(0, 10) >= weekStart)
      .length;
    const st = userStreak(ws, u.id);
    return {
      userId: u.id, name: u.name, focusedMinutes, completedTasks,
      currentStreak: st.current, bestStreak: st.best,
    };
  }).sort((a, b) => b.focusedMinutes - a.focusedMinutes);
}

// ---------------------------------------------------------------------------
// Commitment game — per-user scoring
//   +10 points per completed focus hour (from actual worked minutes only).
//   Missing committed hours at day end → -50 weekly points per hour.
// ---------------------------------------------------------------------------

// Worked minutes today for a single user (sessions they started).
export function userWorkedMinutes(ws: Workspace, userId: string, date: string): number {
  return sessionsForDate(ws, date)
    .filter(s => s.started_by === userId)
    .reduce((sum, s) => sum + liveSessionMinutes(s), 0);
}

export function userSessionCount(ws: Workspace, userId: string, date: string): number {
  return sessionsForDate(ws, date).filter(s => s.started_by === userId).length;
}

export function userCommittedMinutes(ws: Workspace, userId: string, date: string): number | null {
  const c = ws.commitments.find(x => x.user_id === userId && x.work_date === date);
  return c ? c.committed_minutes : null;
}

export function userCommitment(ws: Workspace, userId: string, date: string) {
  return ws.commitments.find(x => x.user_id === userId && x.work_date === date) ?? null;
}

// Score from worked minutes: 10 pts/hour = worked/6, rounded.
export function workedScore(workedMinutes: number): number {
  return Math.round(workedMinutes / 6);
}

export function userMissingMinutes(ws: Workspace, userId: string, date: string): number {
  const committed = userCommittedMinutes(ws, userId, date);
  if (committed == null) return 0;
  return Math.max(0, committed - userWorkedMinutes(ws, userId, date));
}

// Penalty points for missing hours (proportional, 50 pts/hour).
export function penaltyPoints(missingMinutes: number): number {
  return Math.round((missingMinutes / 60) * 50);
}

export function userTodayScore(ws: Workspace, userId: string, date: string): number {
  return workedScore(userWorkedMinutes(ws, userId, date));
}

function datesThisWeek(): string[] {
  const weekStart = startOfWeekISO();
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = isoForOffset(i);
    if (d >= weekStart) out.push(d);
  }
  return out;
}

// Weekly score = sum of daily worked-scores minus penalties for ended days.
export function userWeeklyScore(ws: Workspace, userId: string): number {
  const today = getTodayISO();
  let total = 0;
  for (const date of datesThisWeek()) {
    total += userTodayScore(ws, userId, date);
    if (date < today) {
      const committed = userCommittedMinutes(ws, userId, date);
      if (committed != null) total -= penaltyPoints(userMissingMinutes(ws, userId, date));
    }
  }
  return total;
}

// Distinct days this week the user logged any worked minutes.
export function userDaysWorkedThisWeek(ws: Workspace, userId: string): number {
  return datesThisWeek().filter(d => userWorkedMinutes(ws, userId, d) > 0).length;
}

export type UserStatus = 'Safe' | 'At Risk' | 'No commitment';

export function userStatus(ws: Workspace, userId: string, date: string): UserStatus {
  const committed = userCommittedMinutes(ws, userId, date);
  if (committed == null) return 'No commitment';
  return userWorkedMinutes(ws, userId, date) >= committed ? 'Safe' : 'At Risk';
}

export interface UserTaskStats { done: number; total: number }
export function userTaskStats(ws: Workspace, userId: string, date: string): UserTaskStats {
  const mine = ws.tasks.filter(t => t.work_date === date && t.created_by === userId);
  return { done: mine.filter(t => t.status === 'completed').length, total: mine.length };
}

export interface TeamRow {
  userId: string;
  name: string;
  workedMinutes: number;
  daysWorked: number;
  todayScore: number;
  weeklyScore: number;
  status: UserStatus;
}

export function teamRows(ws: Workspace): TeamRow[] {
  const today = getTodayISO();
  return ws.users.map(u => ({
    userId: u.id,
    name: u.name,
    workedMinutes: userWorkedMinutes(ws, u.id, today),
    daysWorked: userDaysWorkedThisWeek(ws, u.id),
    todayScore: userTodayScore(ws, u.id, today),
    weeklyScore: userWeeklyScore(ws, u.id),
    status: userStatus(ws, u.id, today),
  })).sort((a, b) => b.weeklyScore - a.weeklyScore);
}

// ---------------------------------------------------------------------------
// Deadline helpers
// ---------------------------------------------------------------------------

export function deadlineState(d: Deadline): 'completed' | 'overdue' | 'urgent' | 'upcoming' {
  if (d.status === 'completed') return 'completed';
  const today = getTodayISO();
  if (d.deadline_date < today) return 'overdue';
  if (d.deadline_date === today) return 'urgent';
  return 'upcoming';
}
