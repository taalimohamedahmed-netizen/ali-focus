// POST /functions/v1/daily-plan  — set today's target + optional notes
import { cors, json, err, admin, authUser, ensureTodayPlan, todayISO } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return err('Use POST', 405);

  const db = admin();
  const user = await authUser(req, db);
  if (!user) return err('Invalid or missing API token', 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return err('Invalid JSON body'); }

  const hours = Number(body.target_hours);
  if (!Number.isFinite(hours) || hours < 0) return err('target_hours must be a non-negative number');

  const plan = await ensureTodayPlan(db, user.id, Math.round(hours * 60));
  if (!plan) return err('Could not save day plan', 500);

  if (typeof body.notes === 'string' && body.notes.trim()) {
    await db.from('daily_notes').upsert({
      work_date: todayISO(), content: body.notes,
      updated_by: user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'work_date' });
  }

  return json({ ok: true, plan }, 201);
});
