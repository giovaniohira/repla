import { CATALOG, catKey } from './catalog';
import { supabase } from './supabase';

// Ready-made routines: [catalog exercise name, sets, reps, rest s]. Names must match lib/catalog.ts.
type Item = [name: string, sets: number, reps: number, rest: number];
export type Template = { name: string; sub: string; items: Item[] };

export const TEMPLATES: Template[] = [
  { name: 'Full body', sub: 'Corpo todo, 2-3x por semana', items: [
    ['Agachamento livre', 3, 8, 120], ['Supino reto com halteres', 3, 10, 90], ['Remada curvada com barra', 3, 10, 90],
    ['Desenvolvimento com halteres', 3, 10, 90], ['Rosca alternada com halteres', 2, 12, 60], ['Abdominal reto', 3, 15, 45] ] },
  { name: 'Push (empurrar)', sub: 'Peito, ombros e tríceps', items: [
    ['Supino reto com barra', 4, 8, 120], ['Supino inclinado com halteres', 3, 10, 90], ['Desenvolvimento com halteres', 3, 10, 90],
    ['Elevação lateral', 3, 15, 60], ['Tríceps pulley', 3, 12, 60], ['Tríceps corda', 3, 12, 60] ] },
  { name: 'Pull (puxar)', sub: 'Costas e bíceps', items: [
    ['Puxada frontal', 4, 10, 90], ['Remada baixa na polia', 3, 10, 90], ['Remada unilateral com halter', 3, 10, 90],
    ['Crucifixo inverso', 3, 15, 60], ['Rosca direta com barra', 3, 10, 60], ['Rosca martelo', 3, 12, 60] ] },
  { name: 'Legs (pernas)', sub: 'Quadríceps, posterior e panturrilha', items: [
    ['Agachamento livre', 4, 8, 120], ['Leg press 45°', 3, 12, 90], ['Stiff', 3, 10, 90],
    ['Cadeira extensora', 3, 12, 60], ['Mesa flexora', 3, 12, 60], ['Panturrilha em pé', 4, 15, 45] ] },
];

// Routine ids the editor discarded for being empty; the list hides them while the delete is still in flight.
export const discarded = new Set<string>();

// Copies built-in catalog exercises into `exercises` (once per catalog_key). Returns catalog_key -> exercise id.
export async function ensureExercises(keys: string[]): Promise<Map<string, string>> {
  const have = await supabase.from('exercises').select('id, catalog_key').in('catalog_key', keys).is('deleted_at', null);
  if (have.error) throw have.error;
  const ids = new Map<string, string>((have.data ?? []).map((x) => [x.catalog_key, x.id]));
  const missing = CATALOG.filter((e) => keys.includes(e.key) && !ids.has(e.key));
  if (missing.length) {
    const ins = await supabase.from('exercises').insert(missing.map((e) => ({ name: e.name, muscle_group: e.group, catalog_key: e.key }))).select('id, catalog_key');
    if (ins.error) throw ins.error;
    for (const x of ins.data) ids.set(x.catalog_key, x.id);
  }
  return ids;
}

// Appends exercises to the end of a routine.
export async function addToWorkout(workoutId: string, exerciseIds: string[]) {
  const last = await supabase.from('workout_exercises').select('position').eq('workout_id', workoutId)
    .is('deleted_at', null).order('position', { ascending: false }).limit(1).maybeSingle();
  const p = last.data?.position ?? 0;
  const { error } = await supabase.from('workout_exercises')
    .insert(exerciseIds.map((exercise_id, i) => ({ workout_id: workoutId, exercise_id, position: p + i + 1 })));
  if (error) throw error;
}

// Creates the routine from a template. Returns the workout id.
export async function createFromTemplate(t: Template): Promise<string> {
  const ids = await ensureExercises(t.items.map(([n]) => catKey(n)));
  const w = await supabase.from('workouts').insert({ name: t.name }).select('id').single();
  if (w.error) throw w.error;
  const rows = await supabase.from('workout_exercises').insert(t.items.map(([n, sets, reps, rest], i) => ({
    workout_id: w.data.id, exercise_id: ids.get(catKey(n)), position: i + 1, target_sets: sets, target_reps: reps, rest_s: rest,
  })));
  if (rows.error) throw rows.error;
  return w.data.id;
}
