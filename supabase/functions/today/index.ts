// GET /functions/v1/today  — snapshot of today's goal, tasks, sessions, progress, streak
import { cors, json, err, admin, authUser, todayISO } from '../_shared/util.ts';

interface SessionRow {
  status: string; completed_minutes: number; started_at: string | null; duration_minutes: number;
}

function liveMinutes(s: SessionRow): number {
  if (s.status === 'running' && s.started_at) {
    return s.completed_minutes + (Date.now() - new Date(s.started_at).getTime()) / 60000;
  }
  return s.completed_minutes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const db = admin();
  const user = await authUser(req, db);
  if (!user) return err('Invalid or missing API token', 401);

  const today = todayISO();
  const { data: plan } = await db.from('day_plans').select('*').eq('work_date', today).maybeSingle();
  const { data: tasks } = await db.from('tasks').select('*').eq('work_date', today);
  const { data: sessions } = plan
    ? await db.from('sessions').select('*').eq('day_plan_id', plan.id)
    : { data: [] as SessionRow[] };

  const target = plan?.target_minutes ?? 0;
  const worked = (sessions ?? []).reduce((sum, s) => sum + liveMinutes(s as SessionRow), 0);
  const mustOpen = (tasks ?? []).filter(t => t.type === 'must_finish' && t.status !== 'completed').length;
  const must = (tasks ?? []).filter(t => t.type === 'must_finish');
  const targetMet = target > 0 && worked >= target;
  const mustMet = must.length > 0 && must.every(t => t.status === 'completed');
  const successful = targetMet || mustMet;

  return json({
    date: today,
    user: user.name,
    goal_hours: Math.round((target / 60) * 10) / 10,
    progress: {
      target_minutes: target,
      worked_minutes: Math.round(worked),
      completion_pct: target > 0 ? Math.min(100, Math.round((worked / target) * 100)) : 0,
      sessions_done: (sessions ?? []).filter(s => s.status === 'completed').length,
      sessions_total: (sessions ?? []).length,
    },
    streak_status: successful ? 'Safe' : 'At Risk',
    must_finish_remaining: mustOpen,
    tasks: tasks ?? [],
    sessions: sessions ?? [],
  });
});
