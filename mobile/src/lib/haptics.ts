import * as H from 'expo-haptics';
import { prefs } from '@/lib/prefs';

// expo-haptics behind the "Vibração" preference. Fire-and-forget: rejections (no vibration motor) are swallowed here.
export const { ImpactFeedbackStyle, NotificationFeedbackType } = H;
export const impactAsync = (s: H.ImpactFeedbackStyle) => { if (prefs.haptics) H.impactAsync(s).catch(() => {}); };
export const notificationAsync = (t: H.NotificationFeedbackType) => { if (prefs.haptics) H.notificationAsync(t).catch(() => {}); };
export const selectionAsync = () => { if (prefs.haptics) H.selectionAsync().catch(() => {}); };
