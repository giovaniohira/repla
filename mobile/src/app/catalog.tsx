import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/lib/haptics';
import { catKey, MUSCLE_GROUPS, gifUrl, searchCatalog, type Exercise, type MuscleGroup } from '@/lib/catalog';
import { addToWorkout, ensureExercises } from '@/lib/templates';
import { toast } from '@/ui/Toast';
import { Button } from '@/ui/Button';
import { c, r, lift } from '@/theme';
import { GifModal } from '@/ui/GifModal';

// Exercise catalog. With `workout` in the URL, tapping items selects them; "Adicionar" appends them all to the routine.
export default function Catalog() {
  const { workout } = useLocalSearchParams<{ workout?: string }>();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [viewing, setViewing] = useState<Exercise | null>(null);
  const [picked, setPicked] = useState<string[]>([]); // catalog keys, in tap order
  const [inRoutine, setInRoutine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const list = searchCatalog(q, group);
  const name = q.trim();
  const canCreate = name.length > 1 && !list.some((e) => e.key === catKey(name));

  useEffect(() => {
    if (!workout) return;
    supabase.from('workout_exercises').select('exercises(catalog_key)').eq('workout_id', workout).is('deleted_at', null)
      .then(({ data }) => setInRoutine(new Set((data ?? []).map((x: any) => x.exercises?.catalog_key).filter(Boolean))));
  }, [workout]);

  function toggle(e: Exercise) {
    Haptics.selectionAsync();
    setPicked((p) => (p.includes(e.key) ? p.filter((k) => k !== e.key) : [...p, e.key]));
  }

  // `extra` = ids of exercises that are not in the built-in catalog (a custom one just created)
  async function add(extra: string[] = []) {
    setBusy(true);
    try {
      const ids = await ensureExercises(picked);
      await addToWorkout(workout!, [...picked.map((k) => ids.get(k)!), ...extra]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setBusy(false);
      toast((e as Error).message, { error: true });
    }
  }

  async function create() {
    const ins = await supabase.from('exercises').insert({ name, muscle_group: group }).select('id').single();
    if (ins.error) return toast(ins.error.message, { error: true });
    if (workout) await add([ins.data.id]);
    else { setQ(''); toast(`"${name}" adicionado à sua biblioteca.`); }
  }

  const n = picked.length;
  return (
    <View style={s.screen}>
      <TextInput style={s.input} placeholder="Buscar exercício (ex.: supino)" value={q} onChangeText={setQ} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, padding: 2 }}>
        {MUSCLE_GROUPS.map((g) => (
          <Pressable key={g} onPress={() => setGroup(group === g ? null : g)} style={[s.chip, group === g && s.chipOn]}>
            <Text style={[s.chipTxt, group === g && { color: c.white }]}>{g}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={list}
        keyExtractor={(e) => e.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        ListHeaderComponent={
          canCreate ? (
            <Pressable style={[s.item, { borderWidth: 1, borderColor: c.primary }]} onPress={create}>
              <Text style={[s.name, { color: c.primary }]}>+ Criar &quot;{name}&quot;{group ? ` (${group})` : ''}</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={<Text style={s.sub}>Nada encontrado.</Text>}
        renderItem={({ item }) => {
          const has = inRoutine.has(item.key), on = picked.includes(item.key);
          return (
            <Pressable style={[s.item, s.row, on && s.itemOn]} onPress={() => toggle(item)} disabled={!workout || has}>
              {!!workout && (
                <Ionicons name={has || on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={has ? c.faint : on ? c.primary : c.line} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.name, has && { color: c.muted }]}>{item.name}</Text>
                <Text style={s.sub}>{item.group}{has ? ' · já está na rotina' : ''}</Text>
              </View>
              {item.gif && (
                <Pressable hitSlop={10} onPress={() => setViewing(item)}>
                  <Ionicons name="play-circle-outline" size={28} color={c.primary} />
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />
      {!!workout && n > 0 && <Button label={`Adicionar ${n} exercício${n === 1 ? '' : 's'}`} onPress={() => add()} busy={busy} />}
      <GifModal url={gifUrl(viewing?.key) ?? null} title={viewing?.name ?? ''} onClose={() => setViewing(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, padding: 16, gap: 12 },
  input: { backgroundColor: c.card, borderRadius: r.sm, padding: 12, fontSize: 15, color: c.text },
  chip: { ...lift, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: c.card },
  chipOn: { backgroundColor: c.primary },
  chipTxt: { color: c.text, fontSize: 13 },
  item: { backgroundColor: c.card, borderRadius: r.sm, padding: 12 },
  itemOn: { backgroundColor: c.primarySoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '600', color: c.text },
  sub: { fontSize: 12, color: c.muted },
});
