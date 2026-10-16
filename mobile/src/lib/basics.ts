import { norm } from './catalog';
import type { OffProduct } from './off';
import taco from './taco.json';

// TACO table (UNICAMP, 4th ed.) per 100 g: [name, kcal, protein, carbs, fat]. Source: github.com/marcelosanto/tabela_taco.
// The "taco:*" code goes to foods.off_code, so the copy/dedupe in pickOff works the same way.
const BASE = (taco as [string, number, number, number | null, number | null][]).map(([name, kcal, protein, carbs, fat]) => ({ name, kcal, protein, carbs, fat, n: norm(name) }));

// Every search word must appear; prepared foods before raw, short names before long.
export function searchBasics(q: string): OffProduct[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const raw = (n: string) => /\bcrua?\b/.test(n); // matches Portuguese "cru"/"crua" in the TACO data
  return BASE.filter((f) => words.every((w) => f.n.includes(w)))
    .sort((a, b) => Number(raw(a.n)) - Number(raw(b.n)) || a.name.length - b.name.length)
    .slice(0, 15)
    .map((f) => ({ code: `taco:${f.n}`, name: f.name, kcal_100g: f.kcal, protein_100g: f.protein, carbs_100g: f.carbs, fat_100g: f.fat }));
}
