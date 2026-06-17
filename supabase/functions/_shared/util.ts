// Shared helpers for Ali Focus Edge Functions.
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

// Service-role client (server-side only, full access).
export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export interface AuthUser { id: string; name: string }

// Resolve the caller from the Bearer API token. Returns null if invalid.
export async function authUser(req: Request, db: SupabaseClient): Promise<AuthUser | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data } = await db.from('users').select('id,name').eq('api_token', token).maybeSingle();
  return data ?? null;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRIORITIES = ['high', 'medium', 'low'];
const TYPES = ['must_finish', 'optional'];
export function validPriority(p: unknown): p is string { return typeof p === 'string' && PRIORITIES.includes(p); }
export function validType(t: unknown): t is string { return typeof t === 'string' && TYPES.includes(t); }

// Find a project by name (case-insensitive); create it if missing.
export async function resolveProject(
  db: SupabaseClient, name: string | undefined, userId: string,
): Promise<{ id: string | null; name: string | null }> {
  if (!name || !name.trim()) return { id: null, name: null };
  const trimmed = name.trim();
  const { data: found } = await db.from('projects').select('id,name').ilike('name', trimmed).maybeSingle();
  if (found) return { id: found.id, name: found.name };
  const { data: created } = await db.from('projects')
    .insert({ name: trimmed, created_by: userId }).select('id,name').single();
  return created ? { id: created.id, name: created.name } : { id: null, name: trimmed };
}

export async function ensureTodayPlan(db: SupabaseClient, userId: string, targetMinutes?: number) {
  const work_date = todayISO();
  const { data: existing } = await db.from('day_plans').select('*').eq('work_date', work_date).maybeSingle();
  if (existing) {
    if (targetMinutes !== undefined) {
      const { data } = await db.from('day_plans')
        .update({ target_minutes: targetMinutes, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select('*').single();
      return data ?? existing;
    }
    return existing;
  }
  const { data } = await db.from('day_plans')
    .insert({ work_date, target_minutes: targetMinutes ?? 0, created_by: userId }).select('*').single();
  return data;
}
