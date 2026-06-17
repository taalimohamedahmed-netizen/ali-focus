// POST /functions/v1/sessions  — create a focus session for today
import {
  cors, json, err, admin, authUser, resolveProject, ensureTodayPlan,
} from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return err('Use POST', 405);

  const db = admin();
  const user = await authUser(req, db);
  if (!user) return err('Invalid or missing API token', 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return err('Invalid JSON body'); }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return err('Missing title');

  const minutes = Number(body.estimated_minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return err('estimated_minutes must be a positive number');

  const autoStart = body.auto_start === true;
  // project name is recorded into the title context only (sessions have no project column)
  await resolveProject(db, body.project as string | undefined, user.id);

  const plan = await ensureTodayPlan(db, user.id);
  if (!plan) return err('Could not create day plan', 500);

  const row: Record<string, unknown> = {
    day_plan_id: plan.id,
    title,
    duration_minutes: Math.round(minutes),
  };
  if (autoStart) {
    row.status = 'running';
    row.started_by = user.id;
    row.started_at = new Date().toISOString();
  }

  const { data, error } = await db.from('sessions').insert(row).select('*').single();
  if (error) return err(error.message, 500);
  return json({ ok: true, session: data }, 201);
});
