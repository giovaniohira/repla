import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type Prefs = {
  theme: 'system' | 'light' | 'dark';
  startTab: 'index' | 'nutrition' | 'workouts' | 'progress' | 'profile';
  haptics: boolean;
  keepAwake: boolean;
  gifs: boolean;
};

const KEY = 'prefs';
export const prefs: Prefs = {
  theme: 'system', startTab: 'index', haptics: true, keepAwake: true, gifs: true,
};

// Must finish before theme.ts is imported: styles are built at import time and read the theme from here.
export async function loadPrefs() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    if (s) Object.assign(prefs, JSON.parse(s));
  } catch {}
  Appearance.setColorScheme(prefs.theme === 'system' ? 'unspecified' : prefs.theme);
}

export function setPref<K extends keyof Prefs>(k: K, v: Prefs[K]) {
  prefs[k] = v;
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  if (k === 'theme') Appearance.setColorScheme(v === 'system' ? 'unspecified' : (v as 'light' | 'dark'));
}
