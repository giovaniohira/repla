import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { prefs } from '@/lib/prefs';
import { c } from '@/theme';
import { Tour } from '@/ui/Tour';

type Name = keyof typeof Ionicons.glyphMap;
// filled icon when the tab is active, outline otherwise
const icon = (on: Name, off: Name) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? on : off} color={color} size={size} />;
  };

export default function TabsLayout() {
  return (
    <>
    <Tabs
      initialRouteName={prefs.startTab}
      screenListeners={{ tabPress: () => Haptics.selectionAsync() }}
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: c.text, fontWeight: '700' },
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.card, borderTopWidth: 0 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Alimentação', tabBarIcon: icon('nutrition', 'nutrition-outline') }} />
      <Tabs.Screen name="workouts" options={{ title: 'Treinos', tabBarIcon: icon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
    <Tour />
    </>
  );
}
