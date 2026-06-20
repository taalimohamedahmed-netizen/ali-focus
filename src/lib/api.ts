import { supabase } from '@/lib/supabase';
import {
  User, Project, DayPlan, Session, Task, Deadline, DailyNote, Commitment, Activity,
  Priority, TaskType, getTodayISO,
} from '@/types';

// A full snapshot of the shared workspace. Data is small, so we just load
// everything and compute streaks/scores client-side.
export interface Workspace {
  users: User[];
  projects: Project[];
  dayPlans: DayPlan[];
  sessions: Session[];
  tasks: Task[];
  deadlines: Deadline[];
  notes: DailyNote[];
  commitments: Commitment[];
  activity: Activity[];
}

const EMPTY: Workspace = {
  users: [], projects: [], dayPlans: [], sessions: [], tasks: [], deadlines: [],
  notes: [], commitments: [], activity: [],
};

// ---------------------------------------------------------------------------
// Auth (simple name + password, NOT Supabase Auth)
// ---------------------------------------------------------------------------

export async function loginOrCreate(name: string, password: string):
  Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Name required' };
  if (!password) return { ok: false, error: 'Password required' };

  const { data: existing, error } = await supabase
    .from('users')
    .select('*')
    .eq('name', trimmed)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  if (existing) {
    if (existing.password !== password) return { ok: false, error: 'Wrong password' };
    return { ok: true, user: toUser(existing) };
  }

  const { data: created, error: insErr } = await supabase
    .from('users')
    .insert({ name: trimmed, password })
    .select('*')
    .single();

  if (insErr || !created) return { ok: false, error: insErr?.message ?? 'Could not create user' };
  return { ok: true, user: toUser(created) };
}

function toUser(row: { id: string; name: string; created_at: string }): User {
  return { id: row.id, name: row.name, created_at: row.created_at };
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export async function loadWorkspace(): Promise<Workspace> {
  const [users, projects, dayPlans, sessions, tasks, deadlines, notes, commitments, activity] = await Promise.all([
    supabase.from('users').select('id,name,created_at').order('created_at'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('day_plans').select('*').order('work_date', { ascending: false }),
    supabase.from('sessions').select('*').order('created_at'),
    supabase.from('tasks').select('*').order('created_at'),
    supabase.from('deadlines').select('*').order('deadline_date'),
    supabase.from('daily_notes').select('*'),
    supabase.from('commitments').select('*'),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(40),
  ]);
  return {
    users: users.data ?? [],
    projects: projects.data ?? [],
    dayPlans: dayPlans.data ?? [],
    sessions: sessions.data ?? [],
    tasks: tasks.data ?? [],
    deadlines: deadlines.data ?? [],
    notes: notes.data ?? [],
    commitments: commitments.data ?? [],
    activity: activity.data ?? [],
  } as Workspace;
}

export { EMPTY as EMPTY_WORKSPACE };

async function logActivity(userId: string, action: string, entityType: string, entityId: string | null) {
  await supabase.from('activity_log').insert({
    user_id: userId, action, entity_type: entityType, entity_id: entityId,
  });
}

// A feed/notification event with a human message.
export async function notify(userId: string, type: string, message: string) {
  await supabase.from('activity_log').insert({
    user_id: userId, action: type, type, message,
  });
}

// ---------------------------------------------------------------------------
// Commitments (per user, per day) — hours can be increased, never decreased
// ---------------------------------------------------------------------------

export async function createCommitment(userId: string, committedMinutes: number): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('commitments').insert({
    user_id: userId, work_date: getTodayISO(), committed_minutes: committedMinutes,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function increaseCommitment(id: string, newMinutes: number) {
  await supabase.from('commitments')
    .update({ committed_minutes: newMinutes, updated_at: new Date().toISOString() })
    .eq('id', id);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function addProject(name: string, userId: string) {
  await supabase.from('projects').insert({ name: name.trim(), created_by: userId });
}

export async function renameProject(id: string, name: string) {
  const trimmed = name.trim();
  await supabase.from('projects').update({ name: trimmed }).eq('id', id);
  // keep denormalized names in sync
  await supabase.from('tasks').update({ project_name: trimmed }).eq('project_id', id);
  await supabase.from('deadlines').update({ project_name: trimmed }).eq('project_id', id);
}

export async function deleteProject(id: string) {
  await supabase.from('projects').delete().eq('id', id);
}

// ---------------------------------------------------------------------------
// Day plan + sessions
// ---------------------------------------------------------------------------

export async function ensureTodayPlan(targetMinutes: number, userId: string): Promise<DayPlan | null> {
  const work_date = getTodayISO();
  const { data: existing } = await supabase
    .from('day_plans').select('*').eq('work_date', work_date).maybeSingle();

  if (existing) {
    const { data } = await supabase
      .from('day_plans')
      .update({ target_minutes: targetMinutes, updated_at: new Date().toISOString() })
      .eq('id', existing.id).select('*').single();
    return data ?? existing;
  }
  const { data } = await supabase
    .from('day_plans')
    .insert({ work_date, target_minutes: targetMinutes, created_by: userId })
    .select('*').single();
  return data;
}

export async function addSession(planId: string, title: string, durationMinutes: number) {
  await supabase.from('sessions').insert({
    day_plan_id: planId, title: title.trim(), duration_minutes: durationMinutes,
  });
}

// Create a session already running — used by the one-tap "Start Focus" flow.
// Returns the new session id (used to tag accountability screenshots).
export async function startNewSession(
  planId: string, title: string, durationMinutes: number, userId: string,
): Promise<{ id: string | null; error?: string }> {
  const { data, error } = await supabase.from('sessions').insert({
    day_plan_id: planId,
    title: title.trim() || 'Focus',
    duration_minutes: durationMinutes,
    status: 'running',
    started_by: userId,
    started_at: new Date().toISOString(),
  }).select('id').single();
  if (error) return { id: null, error: error.message };
  await logActivity(userId, 'start_session', 'session', data?.id ?? null);
  return { id: data?.id ?? null };
}

export async function deleteSession(id: string) {
  await supabase.from('sessions').delete().eq('id', id);
}

export async function startSession(s: Session, userId: string) {
  await supabase.from('sessions').update({
    status: 'running', started_by: userId, started_at: new Date().toISOString(),
  }).eq('id', s.id);
  await logActivity(userId, 'start_session', 'session', s.id);
}

// elapsed minutes accrued during the running stretch
function runningMinutes(s: Session): number {
  if (s.status !== 'running' || !s.started_at) return 0;
  return (Date.now() - new Date(s.started_at).getTime()) / 60000;
}

export async function pauseSession(s: Session, userId: string) {
  const completed = Math.round(s.completed_minutes + runningMinutes(s));
  await supabase.from('sessions').update({
    status: 'paused', completed_minutes: completed,
    paused_by: userId, paused_at: new Date().toISOString(),
  }).eq('id', s.id);
  await logActivity(userId, 'pause_session', 'session', s.id);
}

export async function resumeSession(s: Session, userId: string) {
  await supabase.from('sessions').update({
    status: 'running', started_by: userId, started_at: new Date().toISOString(),
  }).eq('id', s.id);
  await logActivity(userId, 'resume_session', 'session', s.id);
}

export async function finishSession(s: Session, userId: string) {
  const completed = Math.round(s.completed_minutes + runningMinutes(s));
  await supabase.from('sessions').update({
    status: 'completed', completed_minutes: completed,
    finished_by: userId, finished_at: new Date().toISOString(),
  }).eq('id', s.id);
  await logActivity(userId, 'finish_session', 'session', s.id);
}

// ---------------------------------------------------------------------------
// Accountability screenshots
// ---------------------------------------------------------------------------

export interface Screenshot {
  id: string;
  session_id: string | null;
  user_id: string | null;
  path: string;
  url: string;
  captured_at: string;
  created_at: string;
}

export async function loadScreenshots(limit = 200): Promise<Screenshot[]> {
  const { data } = await supabase
    .from('screenshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Screenshot[];
}

export async function deleteScreenshot(s: Screenshot) {
  await supabase.storage.from('screenshots').remove([s.path]);
  await supabase.from('screenshots').delete().eq('id', s.id);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function addTask(input: {
  projectId: string | null; projectName: string | null; title: string;
  priority: Priority; type: TaskType; userId: string;
}) {
  await supabase.from('tasks').insert({
    work_date: getTodayISO(),
    project_id: input.projectId,
    project_name: input.projectName,
    title: input.title.trim(),
    priority: input.priority,
    type: input.type,
    created_by: input.userId,
  });
}

export async function completeTask(t: Task, userId: string) {
  const done = t.status === 'completed';
  await supabase.from('tasks').update({
    status: done ? 'open' : 'completed',
    completed_by: done ? null : userId,
    completed_at: done ? null : new Date().toISOString(),
  }).eq('id', t.id);
  if (!done) await logActivity(userId, 'complete_task', 'task', t.id);
}

export async function deleteTask(id: string) {
  await supabase.from('tasks').delete().eq('id', id);
}

export async function updateTaskTitle(id: string, title: string) {
  await supabase.from('tasks').update({ title: title.trim() }).eq('id', id);
}

// ---------------------------------------------------------------------------
// Deadlines
// ---------------------------------------------------------------------------

export async function addDeadline(input: {
  projectId: string | null; projectName: string | null; title: string;
  priority: Priority; deadlineDate: string; userId: string;
}) {
  await supabase.from('deadlines').insert({
    project_id: input.projectId,
    project_name: input.projectName,
    title: input.title.trim(),
    priority: input.priority,
    deadline_date: input.deadlineDate,
    created_by: input.userId,
  });
}

export async function completeDeadline(d: Deadline, userId: string) {
  const done = d.status === 'completed';
  await supabase.from('deadlines').update({
    status: done ? 'open' : 'completed',
    completed_by: done ? null : userId,
    completed_at: done ? null : new Date().toISOString(),
  }).eq('id', d.id);
  if (!done) await logActivity(userId, 'complete_deadline', 'deadline', d.id);
}

export async function deleteDeadline(id: string) {
  await supabase.from('deadlines').delete().eq('id', id);
}

// ---------------------------------------------------------------------------
// Daily notes (autosave, upsert on work_date)
// ---------------------------------------------------------------------------

export async function saveNote(content: string, userId: string) {
  await supabase.from('daily_notes').upsert({
    work_date: getTodayISO(),
    content,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'work_date' });
}

// ---------------------------------------------------------------------------
// AI API token (for Claude Code / Codex via Supabase Edge Functions)
// ---------------------------------------------------------------------------

export async function fetchApiToken(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('api_token').eq('id', userId).maybeSingle();
  return data?.api_token ?? null;
}

export async function generateApiToken(userId: string): Promise<string | null> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = 'aft_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await supabase.from('users').update({ api_token: token }).eq('id', userId);
  if (error) return null;
  return token;
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

export async function exportAll(): Promise<string> {
  const ws = await loadWorkspace();
  return JSON.stringify({ exported_at: new Date().toISOString(), ...ws }, null, 2);
}

// Wipe all activity/score data so the team starts a fresh week.
// Keeps users and projects; removes everything that feeds scores/streaks.
export async function resetAllData(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Remove screenshot files from storage first (rows cascade via day_plans/sessions).
    const { data: shots } = await supabase.from('screenshots').select('path');
    const paths = (shots ?? []).map(s => s.path).filter(Boolean);
    if (paths.length) await supabase.storage.from('screenshots').remove(paths);

    // Delete every row in each table (no real row has a null id).
    const tables = [
      'screenshots', 'sessions', 'tasks', 'deadlines',
      'commitments', 'daily_notes', 'activity_log', 'day_plans',
    ];
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().not('id', 'is', null);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function importAll(json: string): Promise<{ ok: boolean; error?: string }> {
  let parsed: Partial<Workspace>;
  try { parsed = JSON.parse(json); } catch { return { ok: false, error: 'Invalid JSON' }; }

  const tables: [string, unknown[] | undefined][] = [
    ['users', parsed.users], ['projects', parsed.projects], ['day_plans', parsed.dayPlans],
    ['sessions', parsed.sessions], ['tasks', parsed.tasks], ['deadlines', parsed.deadlines],
    ['daily_notes', parsed.notes],
  ];
  try {
    for (const [table, rows] of tables) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const { error } = await supabase.from(table).upsert(rows as object[]);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
