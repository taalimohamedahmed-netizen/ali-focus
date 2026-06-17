// Emits team feed events when a user crosses full worked hours, completes
// their commitment, or works extra hours. Self-contained (reads fresh DB
// state) so it stays correct regardless of client cache timing.
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/api';
import { getTodayISO, Session, User } from '@/types';
import { liveSessionMinutes, workedScore } from '@/lib/metrics';

export interface EmitResult { commitmentCompleted: boolean; newHours: number }

export async function emitProgressEvents(user: User): Promise<EmitResult> {
  const today = getTodayISO();

  const { data: plan } = await supabase
    .from('day_plans').select('id').eq('work_date', today).maybeSingle();
  const { data: commitment } = await supabase
    .from('commitments').select('committed_minutes')
    .eq('user_id', user.id).eq('work_date', today).maybeSingle();

  if (!commitment || commitment.committed_minutes <= 0) return { commitmentCompleted: false, newHours: 0 };

  let worked = 0;
  if (plan) {
    const { data: sessions } = await supabase
      .from('sessions').select('*').eq('day_plan_id', plan.id).eq('started_by', user.id);
    worked = (sessions ?? []).reduce((sum, s) => sum + liveSessionMinutes(s as Session), 0);
  }

  const committed = commitment.committed_minutes;
  const denom = Math.round(committed / 60);
  const hoursComplete = Math.floor(worked / 60);

  // what's already been announced today
  const { data: events } = await supabase
    .from('activity_log').select('type,message')
    .eq('user_id', user.id).gte('created_at', `${today}T00:00:00`);
  const doneHours = new Set<number>();
  let extraCount = 0, commitDone = false;
  for (const e of events ?? []) {
    if (e.type === 'hour_milestone' && e.message) {
      const m = e.message.match(/Hour (\d+)\//);
      if (m) doneHours.add(Number(m[1]));
    } else if (e.type === 'extra_hour') extraCount++;
    else if (e.type === 'commitment_completed') commitDone = true;
  }

  let newHours = 0;
  let commitmentCompleted = false;

  for (let h = 1; h <= Math.min(hoursComplete, denom); h++) {
    if (!doneHours.has(h)) {
      await notify(user.id, 'hour_milestone', `🔥 ${user.name} finished Hour ${h}/${denom}`);
      newHours++;
    }
  }

  if (worked >= committed && !commitDone) {
    await notify(
      user.id, 'commitment_completed',
      `🏆 ${user.name} completed today's ${denom}h commitment! +${workedScore(worked)} pts today`,
    );
    commitmentCompleted = true;
  }

  const extraHours = Math.max(0, hoursComplete - denom);
  for (let i = extraCount; i < extraHours; i++) {
    await notify(user.id, 'extra_hour', `💪 ${user.name} worked an extra hour`);
  }

  return { commitmentCompleted, newHours };
}
