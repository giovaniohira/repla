import { supabase } from '@/lib/supabase';
import { FOOD_COLS, type Food, type MealType } from '@/lib/nutrition';
import type { OffProduct } from '@/lib/off';

// Copies a search/scan result into foods (once per off_code) and returns the stored row.
export async function saveProduct(p: OffProduct): Promise<Food> {
  const found = await supabase.from('foods').select(FOOD_COLS).eq('off_code', p.code).is('deleted_at', null).limit(1).maybeSingle();
  if (found.data) return found.data;
  const ins = await supabase.from('foods')
    .insert({ name: p.name, kcal_100g: p.kcal_100g, protein_100g: p.protein_100g, carbs_100g: p.carbs_100g, fat_100g: p.fat_100g, off_code: p.code })
    .select(FOOD_COLS).single();
  if (ins.error) throw ins.error;
  return ins.data;
}

// Adds `grams` of a food to the date's meal of this type (creating the meal if needed). Returns the new meal_item id.
export async function logFood(foodId: string, grams: number, type: MealType, date: string): Promise<string> {
  const found = await supabase.from('meals').select('id').eq('date', date).eq('type', type).is('deleted_at', null).limit(1).maybeSingle();
  let mealId = found.data?.id;
  if (!mealId) {
    const ins = await supabase.from('meals').insert({ date, type }).select('id').single();
    if (ins.error) throw ins.error;
    mealId = ins.data.id;
  }
  const { data, error } = await supabase.from('meal_items').insert({ meal_id: mealId, food_id: foodId, grams }).select('id').single();
  if (error) throw error;
  return data.id;
}

export const removeItem = (id: string) => supabase.from('meal_items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
export const restoreItem = (id: string) => supabase.from('meal_items').update({ deleted_at: null }).eq('id', id);
export const setGrams = (id: string, grams: number) => supabase.from('meal_items').update({ grams }).eq('id', id);

// Most recently logged distinct foods, each with the grams of its last use.
export async function recentFoods(limit = 30): Promise<(Food & { lastGrams: number })[]> {
  const { data } = await supabase.from('meal_items').select(`grams, food_id, foods(${FOOD_COLS})`)
    .is('deleted_at', null).order('updated_at', { ascending: false }).limit(120);
  const seen = new Set<string>();
  const out: (Food & { lastGrams: number })[] = [];
  for (const x of (data ?? []) as any[]) {
    if (!x.foods || seen.has(x.food_id)) continue;
    seen.add(x.food_id);
    out.push({ ...x.foods, lastGrams: Number(x.grams) });
    if (out.length >= limit) break;
  }
  return out;
}

export async function favoriteFoods(): Promise<Food[]> {
  const { data } = await supabase.from('foods').select(FOOD_COLS).eq('favorite', true).is('deleted_at', null).order('name');
  return data ?? [];
}

export const setFavorite = (id: string, favorite: boolean) => supabase.from('foods').update({ favorite }).eq('id', id);

// Copies every item of `from` into `to`, keeping each meal type. Returns how many items were copied.
export async function copyDay(from: string, to: string): Promise<number> {
  const { data, error } = await supabase.from('meals')
    .select('type, meal_items(food_id, grams, deleted_at)').eq('date', from).is('deleted_at', null);
  if (error) throw error;
  let n = 0;
  for (const m of (data ?? []) as any[]) for (const i of m.meal_items) {
    if (i.deleted_at) continue;
    await logFood(i.food_id, Number(i.grams), m.type, to);
    n++;
  }
  return n;
}
