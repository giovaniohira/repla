import { Appearance } from 'react-native';
import { prefs } from '@/lib/prefs';

const light = {
  bg: '#F4F6F9',
  card: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#DDE3EB',
  track: '#E6EBF2',
  primary: '#0F9D8A',
  primaryDark: '#0A7D6E',
  primarySoft: '#DDF3EF',
  protein: '#4A7BF7',
  carbs: '#F59E0B',
  fat: '#EC4899',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  danger: '#DC2626',
  dark: '#1E293B',
  white: '#FFFFFF',
  shadow: 'rgba(15,23,42,0.1)',
};

const night: typeof light = {
  ...light,
  bg: '#0E1420',
  card: '#182030',
  text: '#E8EDF5',
  muted: '#9AA7BA',
  faint: '#6B788C',
  line: '#2A3548',
  track: '#243044',
  primary: '#22B8A3',
  primaryDark: '#127A6B',
  primarySoft: '#123A36',
  protein: '#6C97FF',
  amberSoft: '#3A2E10',
  danger: '#F05252',
  shadow: 'rgba(0,0,0,0.4)',
};

// Resolved once at launch from the saved preference (styles are built at import time; see entry.tsx).
export const isDark = prefs.theme === 'system' ? Appearance.getColorScheme() === 'dark' : prefs.theme === 'dark';
export const c = isDark ? night : light;

export const r = { card: 20, btn: 18, sm: 12 };

export const lift = { boxShadow: `0 2px 4px ${c.shadow}` } as const;
