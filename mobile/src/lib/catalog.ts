import { prefs } from '@/lib/prefs';

export const MUSCLE_GROUPS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Abdômen'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Built-in catalog (names in Portuguese): [name, muscle group, ExerciseDB GIF id (optional)].
// Copied to exercises with catalog_key = normalized name (dedupe).
const LIST: [string, MuscleGroup, string?][] = [
  ['Supino reto com barra', 'Peito', 'EIeI8Vf'], ['Supino reto com halteres', 'Peito', 'SpYC0Kp'],
  ['Supino inclinado com barra', 'Peito', '3TZduzM'], ['Supino inclinado com halteres', 'Peito', 'ns0SIbU'],
  ['Supino declinado', 'Peito', 'GrO65fd'], ['Crucifixo com halteres', 'Peito'], ['Crucifixo na máquina (peck deck)', 'Peito'],
  ['Crossover na polia', 'Peito', '0CXGHya'], ['Flexão de braço', 'Peito'],
  ['Puxada frontal', 'Costas', 'LEprlgG'], ['Puxada com pegada supinada', 'Costas', 'xBYcQHj'], ['Barra fixa', 'Costas', '0V2YQjW'],
  ['Remada curvada com barra', 'Costas', 'eZyBC3j'], ['Remada unilateral com halter', 'Costas', 'C0MA9bC'],
  ['Remada baixa na polia', 'Costas', 'fUBheHs'], ['Remada cavalinho', 'Costas', 'aaXr7ld'],
  ['Pulldown com corda', 'Costas', 'DT14T9T'], ['Levantamento terra', 'Costas', 'ila4NZS'],
  ['Desenvolvimento com barra', 'Ombros', 'kTbSH9h'], ['Desenvolvimento com halteres', 'Ombros', 'A6wtbuL'],
  ['Elevação lateral', 'Ombros', 'DsgkuIt'], ['Elevação frontal', 'Ombros', '3eGE2JC'], ['Crucifixo inverso', 'Ombros', 'EAs3xL9'],
  ['Remada alta', 'Ombros', 'UDlhcO8'], ['Encolhimento com halteres', 'Ombros'],
  ['Rosca direta com barra', 'Bíceps', '25GPyDY'], ['Rosca alternada com halteres', 'Bíceps', 'BU15nH4'],
  ['Rosca martelo', 'Bíceps', 'slDvUAU'], ['Rosca scott', 'Bíceps', 'qOgPVf6'], ['Rosca concentrada', 'Bíceps', 'gvsWLQw'],
  ['Rosca na polia', 'Bíceps', 'BCGQ6J5'],
  ['Tríceps pulley', 'Tríceps', 'gAwDzB3'], ['Tríceps corda', 'Tríceps', 'dU605di'], ['Tríceps testa', 'Tríceps', 'h8LFzo9'],
  ['Tríceps francês', 'Tríceps', 'NN8nSNT'], ['Tríceps banco (mergulho)', 'Tríceps', '9RT8oQW'],
  ['Supino fechado', 'Tríceps', 'J6Dx1Mu'], ['Coice com halter', 'Tríceps', 'Gi2BXfK'],
  ['Agachamento livre', 'Pernas', 'Gnfo4FM'], ['Agachamento no smith', 'Pernas', 'jFtipLl'], ['Agachamento frontal', 'Pernas', 'zG0zs85'],
  ['Agachamento búlgaro', 'Pernas', '9E25EOx'], ['Leg press 45°', 'Pernas', '2Qh2J1e'], ['Hack squat', 'Pernas', 'Qa55kX1'],
  ['Cadeira extensora', 'Pernas'], ['Mesa flexora', 'Pernas', '17lJ1kr'], ['Cadeira flexora', 'Pernas', 'Zg3XY7P'],
  ['Stiff', 'Pernas', 'hrVQWvE'], ['Afundo com halteres', 'Pernas', 'RRWFUcw'], ['Passada (avanço)', 'Pernas', 'IZVHb27'],
  ['Cadeira adutora', 'Pernas', 'oHsrypV'], ['Cadeira abdutora', 'Pernas', 'CHpahtl'],
  ['Panturrilha em pé', 'Pernas', 'ykUOVze'], ['Panturrilha sentado', 'Pernas', 'bOOdeyc'], ['Panturrilha no leg press', 'Pernas', '7B4F5nZ'],
  ['Elevação pélvica', 'Glúteos'], ['Glúteo na polia (coice)', 'Glúteos', 'HEJ6DIX'], ['Avanço com passada longa', 'Glúteos', 'kMzUs9Y'],
  ['Abdominal reto', 'Abdômen', 'kjJ3VoQ'], ['Abdominal infra (elevação de pernas)', 'Abdômen', '4Ml7QFO'],
  ['Abdominal na polia', 'Abdômen', 'jpgqxiS'], ['Prancha', 'Abdômen', 'CosupLu'], ['Abdominal oblíquo', 'Abdômen', 'cJgSTmh'],
  ['Abdominal na roda', 'Abdômen', 'KtRomty'],
];

export const norm =(s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const catKey = (name: string) => norm(name).replace(/\s+/g, ' ').trim();

export type Exercise = { name: string; group: MuscleGroup; key: string; gif?: string };
export const CATALOG: Exercise[] = LIST.map(([name, group, gif]) => ({ name, group, key: catKey(name), gif }));

// Animated GIF URL (ExerciseDB, free API) from catalog_key; undefined if none.
const GIF = new Map(CATALOG.filter((e) => e.gif).map((e) => [e.key, `https://static.exercisedb.dev/media/${e.gif}.gif`]));
export const gifUrl = (catalogKey?: string | null) => (catalogKey && prefs.gifs ? GIF.get(catalogKey) : undefined);

// Every search word must appear in the name; muscle group is optional.
export function searchCatalog(q: string, group?: MuscleGroup | null): Exercise[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return CATALOG.filter((e) => (!group || e.group === group) && words.every((w) => e.key.includes(w)));
}
