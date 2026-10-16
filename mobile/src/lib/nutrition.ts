export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Café da manhã', icon: 'cafe-outline' },
  { id: 'lunch', label: 'Almoço', icon: 'restaurant-outline' },
  { id: 'dinner', label: 'Jantar', icon: 'moon-outline' },
  { id: 'snack', label: 'Lanche', icon: 'ice-cream-outline' },
] as const;
export type MealType = (typeof MEAL_TYPES)[number]['id'];

// carbs/fat null = unknown (counted as 0)
export type Food = {
  id: string; name: string; kcal_100g: number; protein_100g: number;
  carbs_100g: number | null; fat_100g: number | null;
  favorite?: boolean; serving_g?: number | null; serving_label?: string | null;
};
export const FOOD_COLS = 'id, name, kcal_100g, protein_100g, carbs_100g, fat_100g, favorite, serving_g, serving_label';

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export const macrosOf = (f: Pick<Food, 'kcal_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g'>, grams: number): Macros => ({
  kcal: (f.kcal_100g * grams) / 100,
  protein: (f.protein_100g * grams) / 100,
  carbs: ((f.carbs_100g ?? 0) * grams) / 100,
  fat: ((f.fat_100g ?? 0) * grams) / 100,
});
export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat,
});
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
export const r1 = (n: number) => Math.round(n * 10) / 10;

// local date (not UTC) as yyyy-mm-dd
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => ymd(new Date());
export const parseDay = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export const shiftDate = (s: string, n: number) => { const d = parseDay(s); d.setDate(d.getDate() + n); return ymd(d); };
export const dayLabel = (s: string) => {
  if (s === today()) return 'Hoje';
  if (s === shiftDate(today(), -1)) return 'Ontem';
  return parseDay(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
};
export const shortDate = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export const num = (s: string) => Number(s.replace(',', '.'));

// local calendar day of an ISO timestamp (timestamptz comes back in UTC)
export const localDay = (iso: string) => ymd(new Date(iso));
export const ago = (iso: string | null) => {
  if (!iso) return 'Ainda não feito';
  const d = Math.round((+parseDay(today()) - +parseDay(localDay(iso))) / 86400000);
  return d <= 0 ? 'Feito hoje' : d === 1 ? 'Feito ontem' : `Feito há ${d} dias`;
};
