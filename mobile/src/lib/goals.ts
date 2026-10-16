import type { Ionicons } from '@expo/vector-icons';

type Icon = keyof typeof Ionicons.glyphMap;

export const GOALS: { icon: Icon; k: 'lose' | 'maintain' | 'gain'; label: string; desc: string; adj: number }[] = [
  { icon: 'trending-down', k: 'lose', label: 'Perder peso', desc: 'Comer menos do que você gasta', adj: -500 },
  { icon: 'remove', k: 'maintain', label: 'Manter peso', desc: 'Comer o mesmo que você gasta', adj: 0 },
  { icon: 'trending-up', k: 'gain', label: 'Ganhar massa muscular', desc: 'Comer mais do que você gasta', adj: 300 },
];

export const ACTIVITY: { icon: Icon; label: string; desc: string; f: number }[] = [
  { icon: 'bed-outline', label: 'Pouco ativo', desc: 'Dia sentado, quase sem exercício', f: 1.2 },
  { icon: 'walk-outline', label: 'Leve (1-3x/sem)', desc: 'Caminhadas ou treinos leves', f: 1.375 },
  { icon: 'bicycle-outline', label: 'Moderado (3-5x/sem)', desc: 'Treino regular na academia', f: 1.55 },
  { icon: 'barbell-outline', label: 'Intenso (6-7x/sem)', desc: 'Treino pesado quase todo dia', f: 1.725 },
];

export type Body = { sex: 'm' | 'f'; age: number; height: number; weight: number; goal: 'lose' | 'maintain' | 'gain'; act: number };
export type Targets = { kcal: number; protein: number; carbs: number; fat: number };

// fat = 25% of kcal, carbs = the rest after protein and fat
export function splitMacros(kcal: number, protein: number): Targets {
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

// Mifflin-St Jeor BMR x activity factor +/- goal adjustment
export function calcTargets(b: Body): Targets {
  const bmr = 10 * b.weight + 6.25 * b.height - 5 * b.age + (b.sex === 'm' ? 5 : -161);
  const kcal = Math.round((bmr * ACTIVITY[b.act].f + GOALS.find((g) => g.k === b.goal)!.adj) / 10) * 10;
  return splitMacros(kcal, Math.round(b.weight * (b.goal === 'gain' ? 2 : 1.6)));
}

// Weeks to reach goalWeight at the pace the daily kcal adjustment implies (~7700 kcal per kg):
// lose -500/day = ~0.45 kg/week, gain +300/day = ~0.27 kg/week. Both are healthy rates.
export function weeksToGoal(weight: number, goalWeight: number, goal: Body['goal']) {
  const adj = Math.abs(GOALS.find((g) => g.k === goal)!.adj);
  return adj ? Math.max(1, Math.ceil((Math.abs(goalWeight - weight) * 7700) / (adj * 7))) : 0;
}
