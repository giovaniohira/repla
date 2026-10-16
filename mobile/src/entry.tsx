import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { useEffect, useState, type ComponentType } from 'react';
import { Text } from 'react-native';
import { loadPrefs } from '@/lib/prefs';

// Custom entry: load the saved preferences (theme, ...) before anything that reads them is imported,
// then require the real expo-router app.
function Root() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loadPrefs().catch(() => {}).then(() => setApp(() => require('expo-router/build/qualified-entry').App)).catch((e) => setErr(String(e?.stack ?? e)));
  }, []);
  if (err) return <Text style={{ padding: 40, paddingTop: 80 }}>{err}</Text>;
  return App ? <App /> : null;
}

registerRootComponent(Root);
