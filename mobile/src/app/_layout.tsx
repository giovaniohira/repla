import { Stack } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { commitDraft, loadDraft } from '@/lib/draft';
import { c } from '@/theme';
import { ToastHost } from '@/ui/Toast';
import { DialogHost } from '@/ui/Dialog';

const head = { headerShown: true, headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTintColor: c.text } as const;

export default function RootLayout() {
  // undefined = still loading the stored session
  const [session, setSession] = useState<Session | null | undefined>();

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden').catch(() => {}); // Android: immersive, swipe up to peek
    supabase.auth.getSession().then(({ data }) => setSession(data.session), () => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  const onboarded = !!session?.user.user_metadata?.onboarded;
  // user id whose saved onboarding draft was already handled
  const [synced, setSynced] = useState<string>();

  // account just created: write the onboarding answers saved before signup
  useEffect(() => {
    if (!uid || onboarded) return;
    loadDraft().then((d) => (d?.sex ? commitDraft() : '')).finally(() => setSynced(uid));
  }, [uid, onboarded]);

  if (session === undefined || (uid && !onboarded && synced !== uid)) return null;

  const signedIn = !!session;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-food" options={{ ...head, title: 'Adicionar' }} />
          <Stack.Screen name="scan" options={{ ...head, title: 'Escanear código', presentation: 'modal' }} />
          <Stack.Screen name="workout" options={{ ...head, title: 'Rotina' }} />
          <Stack.Screen name="session" options={{ gestureEnabled: false }} />
          <Stack.Screen name="templates" options={{ ...head, title: 'Modelos de treino' }} />
          <Stack.Screen name="catalog" options={{ ...head, title: 'Exercícios' }} />
          <Stack.Screen name="goals" options={{ ...head, title: 'Metas e dados' }} />
          <Stack.Screen name="settings" options={{ ...head, title: 'Preferências' }} />
          <Stack.Screen name="account" options={{ ...head, title: 'Conta' }} />
          <Stack.Screen name="about" options={{ ...head, title: 'Sobre' }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="plan" />
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
      <DialogHost />
    </GestureHandlerRootView>
  );
}
