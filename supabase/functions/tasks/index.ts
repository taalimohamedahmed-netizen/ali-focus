// POST /functions/v1/tasks  — create a task for today
import {
  cors, json, err, admin, authUser, todayISO, resolveProject, validPriority, validType,
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

  const priority = body.priority ?? 'medium';
  if (!validPriority(priority)) return err('priority must be high, medium, or low');
  const type = body.type ?? 'must_finish';
  if (!validType(type)) return err('type must be must_finish or optional');

  const project = await resolveProject(db, body.project as string | undefined, user.id);

  const { data, error } = await db.from('tasks').insert({
    work_date: todayISO(),
    project_id: project.id,
    project_name: project.name,
    title,
    priority,
    type,
    created_by: user.id,
  }).select('*').single();

  if (error) return err(error.message, 500);
  return json({ ok: true, task: data }, 201);
});
