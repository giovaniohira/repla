import AsyncStorage from '@react-native-async-storage/async-storage';

// Network-first read; on failure falls back to the last successful result (basic offline read cache).
export async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T | null> {
  try {
    const v = await fetcher();
    AsyncStorage.setItem(`cache:${key}`, JSON.stringify(v)).catch(() => {});
    return v;
  } catch {
    const s = await AsyncStorage.getItem(`cache:${key}`).catch(() => null);
    return s ? (JSON.parse(s) as T) : null;
  }
}
