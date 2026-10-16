import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { today } from '@/lib/nutrition';
import { splitMacros } from '@/lib/goals';

export type Plan = 'free' | 'monthly' | 'annual';

// Onboarding answers kept on the device until the account exists (the flow ends with signup).
export type Draft = {
  focus: 'meals' | 'workouts' | 'both';
  sex: 'm' | 'f'; age: number; height: number; weight: number;
  goal: string; goalWeight: number; act: number; kcal: number; protein: number;
  plan: Plan;
};

const KEY = 'onboarding_draft';

export async function loadDraft(): Promise<Draft | null> {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export const saveDraft = (patch: Partial<Draft>) =>
  loadDraft().then((d) => AsyncStorage.setItem(KEY, JSON.stringify({ plan: 'free', ...d, ...patch }))).catch(() => {});

// Writes the draft to the signed-in user's profile, then flags onboarded (USER_UPDATED unlocks the tabs).
// Returns an error message, or '' on success / nothing to commit.
export async function commitDraft(): Promise<string> {
  const d = await loadDraft();
  if (!d?.sex) return '';
  const m = splitMacros(d.kcal, d.protein);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 'Sessão expirada.';
  const { error } = await supabase.from('profiles').update({
    goal_kcal: d.kcal, goal_protein_g: d.protein, goal_carbs_g: m.carbs, goal_fat_g: m.fat,
    sex: d.sex, age: d.age, height_cm: d.height, weight_kg: d.weight, activity: d.act, goal_type: d.goal, goal_weight_kg: d.goalWeight,
  }).eq('user_id', u.user.id);
  if (error) return error.message;
  await supabase.from('body_weights').upsert({ date: today(), weight_kg: d.weight }, { onConflict: 'user_id,date' });
  // ponytail: plan lives in user_metadata (client-writable) until real billing exists; move to a server-checked table then
  const { error: e2 } = await supabase.auth.updateUser({ data: { onboarded: true, plan: d.plan, focus: d.focus } });
  if (e2) return e2.message;
  AsyncStorage.removeItem(KEY).catch(() => {});
  return '';
}
