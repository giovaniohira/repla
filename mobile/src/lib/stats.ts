import { supabase } from '@/lib/supabase';
import { addMacros, localDay, macrosOf, shiftDate, today, ZERO, type Macros } from '@/lib/nutrition';

export type DayTotals = Record<string, Macros>;

// Per-day macro totals for [from, to] (inclusive, yyyy-mm-dd).
export async function nutritionRange(from: string, to: string): Promise<DayTotals> {
  const { data, error } = await supabase.from('meals')
    .select('date, meal_items(grams, deleted_at, foods(kcal_100g, protein_100g, carbs_100g, fat_100g))')
    .gte('date', from).lte('date', to).is('deleted_at', null);
  if (error) throw error;
  const out: DayTotals = {};
  for (const m of (data ?? []) as any[]) for (const i of m.meal_items) {
    if (i.deleted_at) continue;
    out[m.date] = addMacros(out[m.date] ?? ZERO, macrosOf(i.foods, i.grams));
  }
  return out;
}

export type SetRow = { exercise_id: string; set_number: number; weight_kg: number; reps: number };
export type SessionRow = {
  id: string; workout: string; started_at: string; ended_at: string;
  sets: (SetRow & { name: string })[]; volume: number; minutes: number;
};

// Finished sessions, newest first, with their sets, volume (kg x reps) and duration.
export async function sessionHistory(limit = 60): Promise<SessionRow[]> {
  const { data, error } = await supabase.from('sessions')
    .select('id, started_at, ended_at, workouts(name), set_logs(exercise_id, set_number, weight_kg, reps, deleted_at, exercises(name))')
    .not('ended_at', 'is', null).is('deleted_at', null).order('started_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).flatMap((s) => {
    const sets = s.set_logs.filter((x: any) => !x.deleted_at).map((x: any) => ({
      exercise_id: x.exercise_id, set_number: x.set_number, weight_kg: +x.weight_kg, reps: x.reps, name: x.exercises?.name ?? '?',
    }));
    if (!sets.length) return [];
    return [{
      id: s.id, workout: s.workouts?.name ?? 'Treino', started_at: s.started_at, ended_at: s.ended_at, sets,
      volume: sets.reduce((a: number, x: SetRow) => a + x.weight_kg * x.reps, 0),
      minutes: Math.max(1, Math.round((+new Date(s.ended_at) - +new Date(s.started_at)) / 60000)),
    }];
  });
}

export type ExProgress = { id: string; name: string; pr: number; points: { date: string; best: number }[] };

// Per exercise: best weight per session (oldest first) and the all-time PR.
export function exerciseProgress(sessions: SessionRow[]): ExProgress[] {
  const map = new Map<string, ExProgress>();
  for (const s of [...sessions].reverse()) {
    const best = new Map<string, number>();
    for (const x of s.sets) best.set(x.exercise_id, Math.max(best.get(x.exercise_id) ?? 0, x.weight_kg));
    for (const [id, w] of best) {
      const name = s.sets.find((x) => x.exercise_id === id)!.name;
      const e = map.get(id) ?? { id, name, pr: 0, points: [] };
      e.points.push({ date: localDay(s.started_at), best: w });
      e.pr = Math.max(e.pr, w);
      map.set(id, e);
    }
  }
  return [...map.values()].sort((a, b) => b.points.length - a.points.length);
}

// Sets of the most recent finished session for each exercise ("last time" hints).
// Newest logs first; the first session seen per exercise is its latest one.
// ponytail: capped at 600 logs, enough for months of these exercises; page if hints go missing for rare ones
export async function lastSets(exerciseIds: string[]): Promise<Record<string, SetRow[]>> {
  const { data, error } = await supabase.from('set_logs')
    .select('exercise_id, set_number, weight_kg, reps, session_id, sessions!inner(ended_at, deleted_at)')
    .in('exercise_id', exerciseIds).is('deleted_at', null)
    .not('sessions.ended_at', 'is', null).is('sessions.deleted_at', null)
    .order('updated_at', { ascending: false }).limit(600);
  if (error) throw error;
  const latest = new Map<string, string>();
  const out: Record<string, SetRow[]> = {};
  for (const x of data ?? []) {
    if (!latest.has(x.exercise_id)) latest.set(x.exercise_id, x.session_id);
    if (latest.get(x.exercise_id) !== x.session_id) continue;
    (out[x.exercise_id] ??= []).push({ exercise_id: x.exercise_id, set_number: x.set_number, weight_kg: +x.weight_kg, reps: x.reps });
  }
  for (const k in out) out[k].sort((a, b) => a.set_number - b.set_number);
  return out;
}

// Estimated 1-rep max (Epley): a PR is more weight or more reps at the same weight.
export const e1rm = (kg: number, reps: number) => kg * (1 + reps / 30);

// All-time best e1RM per exercise (for PR detection).
export async function prs(exerciseIds: string[]): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('set_logs').select('exercise_id, weight_kg, reps').in('exercise_id', exerciseIds).is('deleted_at', null);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const x of data ?? []) out[x.exercise_id] = Math.max(out[x.exercise_id] ?? 0, e1rm(+x.weight_kg, x.reps));
  return out;
}

export const RESUME_MS = 6 * 3600 * 1000; // an unfinished session older than this is closed instead of resumed

// Unfinished session with at least one set, recent enough to resume ("Continuar treino").
export async function activeSession(): Promise<{ workout: string; name: string } | null> {
  const { data, error } = await supabase.from('sessions').select('workout_id, workouts(name), set_logs(id, deleted_at)')
    .is('ended_at', null).is('deleted_at', null).not('workout_id', 'is', null)
    .gte('started_at', new Date(Date.now() - RESUME_MS).toISOString()).order('started_at', { ascending: false });
  if (error) throw error;
  const s = ((data ?? []) as any[]).find((x) => x.set_logs.some((l: any) => !l.deleted_at));
  return s ? { workout: s.workout_id, name: s.workouts?.name ?? 'Treino' } : null;
}

// Closes every unfinished session except `keep`: ended at its last set, or deleted if it has none.
// Without this an abandoned workout never reaches history or the streak.
export async function closeStale(keep: string | null) {
  const { data } = await supabase.from('sessions').select('id, started_at, set_logs(updated_at, deleted_at)')
    .is('ended_at', null).is('deleted_at', null);
  await Promise.all(((data ?? []) as any[]).filter((x) => x.id !== keep).map((x) => {
    const ends = x.set_logs.filter((l: any) => !l.deleted_at).map((l: any) => l.updated_at as string).sort();
    const patch = ends.length ? { ended_at: ends[ends.length - 1] } : { deleted_at: new Date().toISOString() };
    return supabase.from('sessions').update(patch).eq('id', x.id);
  }));
}

// Consecutive days (ending today, or yesterday if today is still empty) with a logged meal or a finished workout.
export async function streakInfo(): Promise<{ days: number; today: boolean }> {
  const from = shiftDate(today(), -90);
  const [m, s] = await Promise.all([
    supabase.from('meals').select('date, meal_items(id, deleted_at)').gte('date', from).is('deleted_at', null),
    supabase.from('sessions').select('started_at').gte('started_at', from).not('ended_at', 'is', null).is('deleted_at', null),
  ]);
  const days = new Set<string>();
  for (const x of (m.data ?? []) as any[]) if (x.meal_items.some((i: any) => !i.deleted_at)) days.add(x.date);
  for (const x of s.data ?? []) days.add(localDay(x.started_at));
  let d = today(), n = 0;
  const done = days.has(d);
  if (!done) d = shiftDate(d, -1);
  while (days.has(d)) { n++; d = shiftDate(d, -1); }
  return { days: n, today: done };
}
export const streak = async () => (await streakInfo()).days;

export async function weights(days = 90): Promise<{ date: string; kg: number }[]> {
  const { data } = await supabase.from('body_weights').select('date, weight_kg')
    .gte('date', shiftDate(today(), -days)).is('deleted_at', null).order('date');
  return (data ?? []).map((x) => ({ date: x.date, kg: +x.weight_kg }));
}

// upsert also revives a soft-deleted row for the same day
export const logWeight = (kg: number, date = today()) =>
  supabase.from('body_weights').upsert({ date, weight_kg: kg, deleted_at: null }, { onConflict: 'user_id,date' });

// Most recent finished-session start per workout; `rows` must be newest first.
export function lastByWorkout(rows: { workout_id: string | null; started_at: string }[] | null) {
  const last = new Map<string, string>();
  for (const x of rows ?? []) if (x.workout_id && !last.has(x.workout_id)) last.set(x.workout_id, x.started_at);
  return last;
}

export type Next = { id: string; name: string; n: number; last: string | null } | null;

// Suggests the routine that was done longest ago (never done comes first).
export async function nextWorkout(): Promise<Next> {
  const [w, s] = await Promise.all([
    supabase.from('workouts').select('id, name, workout_exercises(id, deleted_at)').is('deleted_at', null),
    supabase.from('sessions').select('workout_id, started_at').not('ended_at', 'is', null).is('deleted_at', null).order('started_at', { ascending: false }).limit(60),
  ]);
  if (w.error) throw w.error;
  const last = lastByWorkout(s.data);
  const list = ((w.data ?? []) as any[])
    .map((x) => ({ id: x.id as string, name: x.name as string, n: x.workout_exercises.filter((e: any) => !e.deleted_at).length as number, last: last.get(x.id) ?? null }))
    .filter((x) => x.n > 0)
    .sort((a, b) => (a.last ?? '').localeCompare(b.last ?? ''));
  return list[0] ?? null;
}
