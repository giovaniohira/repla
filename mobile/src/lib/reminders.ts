import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as N from 'expo-notifications';
import { Platform } from 'react-native';

// Local notifications only (no push server): rest timer end, meal reminders, streak at risk, weekly recap.
// Times are fixed on purpose. Everything is a no-op on web.
export type Prefs = { rest: boolean; meals: boolean; streak: boolean; weekly: boolean };
export const ALL_ON: Prefs = { rest: true, meals: true, streak: true, weekly: true };

const KEY = 'reminders';
// Expo Go on Android throws on import (SDK 53+): treat as unsupported and no-op instead of crashing the app.
let Notifications = {} as typeof N;
let on = Platform.OS !== 'web';
if (on) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch {
    on = false;
  }
}

if (on) {
  // the rest timer already vibrates in the foreground, so its notification only shows when the app is in the background
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const quiet = n.request.content.data?.kind === 'rest';
      return { shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: !quiet, shouldShowList: !quiet };
    },
  });
  Notifications.setNotificationChannelAsync('default', { name: 'Lembretes', importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
}

// null = the user was never asked
export async function getPrefs(): Promise<Prefs | null> {
  const s = await AsyncStorage.getItem(KEY).catch(() => null);
  return s ? { ...ALL_ON, ...JSON.parse(s) } : null;
}

const granted = async () => on && (await Notifications.getPermissionsAsync()).granted;

// Saves the choice; asks the OS for permission the first time something is turned on. Returns false if the OS said no.
export async function setPrefs(p: Prefs): Promise<boolean> {
  if (!on) return false;
  let ok = await granted();
  if (!ok && Object.values(p).some(Boolean)) ok = (await Notifications.requestPermissionsAsync()).granted;
  await AsyncStorage.setItem(KEY, JSON.stringify(ok ? p : { rest: false, meals: false, streak: false, weekly: false })).catch(() => {});
  if (!ok) await cancelAll();
  else await syncReminders();
  return ok;
}

export const dismissedPrompt = async () => (await AsyncStorage.getItem('reminders:dismissed').catch(() => null)) === '1';
export const dismissPrompt = () => AsyncStorage.setItem('reminders:dismissed', '1').catch(() => {});

const IDS = ['meal-lunch', 'meal-dinner', 'streak', 'weekly'];
const cancelAll = () => Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
const T = Notifications.SchedulableTriggerInputTypes ?? ({} as typeof N.SchedulableTriggerInputTypes);
const content = (title: string, body: string) => ({ title, body });

// Rebuilds the scheduled reminders. `streak` = current run of days and whether today is already covered.
// The streak warning is a one-shot for 20:30 today (or tomorrow when today is done), so it never nags after you logged.
export async function syncReminders(streak?: { days: number; today: boolean }) {
  const p = await getPrefs();
  if (!p || !(await granted())) return;
  await cancelAll();
  const jobs: Promise<unknown>[] = [];
  if (p.meals) {
    jobs.push(Notifications.scheduleNotificationAsync({ identifier: 'meal-lunch', content: content('Hora do almoço', 'Registre o que você comeu para manter as metas em dia.'), trigger: { type: T.DAILY, hour: 12, minute: 30 } }));
    jobs.push(Notifications.scheduleNotificationAsync({ identifier: 'meal-dinner', content: content('Como foi o jantar?', 'Leva 10 segundos: adicione dos recentes.'), trigger: { type: T.DAILY, hour: 19, minute: 30 } }));
  }
  if (p.weekly) {
    jobs.push(Notifications.scheduleNotificationAsync({ identifier: 'weekly', content: content('Seu resumo da semana', 'Veja treinos, proteína e peso dos últimos 7 dias.'), trigger: { type: T.WEEKLY, weekday: 1, hour: 19, minute: 0 } }));
  }
  if (p.streak && streak && streak.days > 0) {
    const at = new Date();
    at.setHours(20, 30, 0, 0);
    if (streak.today || at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
    const days = streak.today ? streak.days + 1 : streak.days;
    jobs.push(Notifications.scheduleNotificationAsync({
      identifier: 'streak',
      content: content(streak.today ? 'Continue a sequência' : `Sua sequência de ${streak.days} ${streak.days === 1 ? 'dia' : 'dias'} acaba hoje`, `Registre uma refeição ou treino e chegue a ${days} dias.`),
      trigger: { type: T.DATE, date: at },
    }));
  }
  await Promise.all(jobs).catch(() => {});
}

// Rest timer: one notification, replaced when the timer is adjusted. No-op unless the user turned it on.
export async function scheduleRest(at: Date, next: string) {
  const p = await getPrefs();
  if (!p?.rest || !(await granted()) || at.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'rest',
    content: { title: 'Descanso acabou', body: next ? `A seguir: ${next}` : 'Hora da próxima série.', data: { kind: 'rest' } },
    trigger: { type: T.DATE, date: at },
  }).catch(() => {});
}
export const cancelRest = () => (on ? Notifications.cancelScheduledNotificationAsync('rest').catch(() => {}) : Promise.resolve());
