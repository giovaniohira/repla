import { Share } from 'react-native';
import { supabase } from '@/lib/supabase';

// Every table the user owns, as one JSON document, handed to the system share sheet (save to Drive, e-mail, ...).
export async function exportData() {
  const q = (t: string, sel = '*') => supabase.from(t).select(sel).is('deleted_at', null);
  const res = await Promise.all([
    supabase.from('profiles').select('*'),
    q('foods'), q('meals', '*, meal_items(*)'), q('body_weights'), q('exercises'),
    q('workouts', '*, workout_exercises(*)'), q('sessions', '*, set_logs(*)'),
  ]);
  const err = res.find((x) => x.error)?.error;
  if (err) throw err;
  const [profile, foods, meals, body_weights, exercises, workouts, sessions] = res.map((x) => x.data);
  const message = JSON.stringify({ exported_at: new Date().toISOString(), profile, foods, meals, body_weights, exercises, workouts, sessions }, null, 2);
  await Share.share({ title: 'repla-dados.json', message });
}
