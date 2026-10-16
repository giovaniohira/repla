import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cached } from '@/lib/cache';
import { addMacros, macrosOf, today, ZERO, type Macros } from '@/lib/nutrition';

export type Item = {
  id: string; grams: number;
  foods: { name: string; kcal_100g: number; protein_100g: number; carbs_100g: number | null; fat_100g: number | null };
};
export type Meal = { id: string; type: string; meal_items: Item[] };
export type Goals = { goal_kcal: number; goal_protein_g: number; goal_carbs_g: number; goal_fat_g: number };

// Goals + the meals of `date`; reloads on focus, falls back to cache offline. `loading` is true only until the first load.
export function useDay(date: string = today()) {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await cached(`day:${date}`, async () => {
      const [p, m] = await Promise.all([
        supabase.from('profiles').select('goal_kcal, goal_protein_g, goal_carbs_g, goal_fat_g').maybeSingle(),
        supabase.from('meals')
          .select('id, type, meal_items(id, grams, foods(name, kcal_100g, protein_100g, carbs_100g, fat_100g))')
          .eq('date', date).is('deleted_at', null).is('meal_items.deleted_at', null),
      ]);
      if (p.error || m.error) throw p.error ?? m.error;
      return { goals: p.data as Goals | null, meals: (m.data as unknown as Meal[]) ?? [] };
    });
    if (res) { setGoals(res.goals); setMeals(res.meals); }
    setLoading(false);
  }, [date]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = meals.flatMap((m) => m.meal_items);
  const total: Macros = items.reduce((a, i) => addMacros(a, macrosOf(i.foods, i.grams)), ZERO);

  return { goals, meals, items, total, loading, load };
}
