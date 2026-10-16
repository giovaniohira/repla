import { router } from 'expo-router';
import * as Haptics from '@/lib/haptics';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CATALOG, catKey } from '@/lib/catalog';
import { createFromTemplate, TEMPLATES, type Template } from '@/lib/templates';
import { c, r } from '@/theme';
import { Button } from '@/ui/Button';
import { toast } from '@/ui/Toast';
import { dialog } from '@/ui/Dialog';
import { supabase } from '@/lib/supabase';

const groups = (t: Template) => [...new Set(t.items.map(([n]) => CATALOG.find((e) => e.key === catKey(n))?.group))].filter(Boolean) as string[];

// Ready-made routines: one tap creates it and opens the editor to tweak loads.
export default function Templates() {
  const [busy, setBusy] = useState<string | null>(null);
  const [mine, setMine] = useState<Map<string, string>>(new Map()); // routine name -> id

  useEffect(() => {
    supabase.from('workouts').select('id, name').is('deleted_at', null)
      .then(({ data }) => setMine(new Map((data ?? []).map((w) => [w.name, w.id]))));
  }, []);

  // already created from this template: offer the existing routine instead of a duplicate
  function pick(t: Template) {
    const id = mine.get(t.name);
    if (!id) return create(t);
    dialog(`Você já tem "${t.name}"`, 'Abrir a rotina que você já tem ou criar outra cópia?', [
      { text: 'Abrir a minha', onPress: () => router.replace({ pathname: '/workout', params: { id } }) },
      { text: 'Criar outra cópia', onPress: () => create(t) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function create(t: Template) {
    setBusy(t.name);
    try {
      const id = await createFromTemplate(t);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/workout', params: { id } });
    } catch (e) {
      setBusy(null);
      toast((e as Error).message, { error: true });
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.sub}>Escolha um modelo, ajuste as cargas e comece. Você pode trocar qualquer exercício depois.</Text>
      {TEMPLATES.map((t, i) => (
        <Animated.View key={t.name} entering={FadeInDown.delay(i * 60)} style={s.card}>
          <Text style={s.name}>{t.name}</Text>
          <Text style={s.sub}>{t.sub} · {t.items.length} exercícios</Text>
          <View style={s.tags}>{groups(t).map((g) => <Text key={g} style={s.tag}>{g}</Text>)}</View>
          <Button label="Usar este modelo" onPress={() => pick(t)} busy={busy === t.name} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderRadius: r.card, padding: 16, gap: 8 },
  name: { fontSize: 18, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.muted },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  tag: { fontSize: 11, color: c.primaryDark, backgroundColor: c.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
});
